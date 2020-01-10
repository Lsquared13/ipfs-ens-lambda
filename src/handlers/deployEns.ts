import { SQSEvent, SQSRecord } from '@eximchain/api-types/spec/events';
import { successResponse, unexpectedErrorResponse } from '@eximchain/api-types/spec/responses';
import { DynamoDB, SQS, ENS, CodePipeline, IPFS, EnsTransitionFxns } from "../services"
import { DeployItem, DeployStates, Transitions } from '@eximchain/ipfs-ens-types/spec/deployment';
import { ensRootDomain, ethAddress } from '../env';
import web3, { getBlockTimestamp } from '../services/web3';

interface SqsMessageBody {
  Method: string
  EnsName: string
}

/**
 * invariant: this Lambda function feeds from an SQS trigger with Batch Size set to one (only one record in each event)
 * invariant: only one instance of this function should run at a time
 * @param event 
 */
const DeployEns = async (event: SQSEvent) => {
  console.log("DeployEns request: " + JSON.stringify(event));

  // NOTE: There should only be one record in each event, leaving a map over records to be ready for change, should work fine with concurrent queue as well. 
  let records = event.Records;
  let processRecordsPromise = Promise.all(records.map(processRecord));

  try {
    let result = await processRecordsPromise;
    return successResponse(result);
  } catch (err) {
    console.log(`Error processing record: `,err);
    throw unexpectedErrorResponse(err);
  }

}

async function processRecord(record: SQSRecord) {

  //Retrieve DDB state to figure out what to do
  let item = await DynamoDB.getDeployItem(record.body);
  
  if (item === null) {
    throw new Error("failed to fetch database record")
  }

  let ensName = item.ensName;
  switch (item.state) {
    case DeployStates.REGISTERING_ENS:
      return await handleTxTransitions({
        item,
        stage: Transitions.Names.All.ENS_REGISTER,
        txThunk: async (nonce) => await ENS.makeSubDomain(ensName, nonce)
      });
    
    case DeployStates.SETTING_RESOLVER_ENS:
      return await handleTxTransitions({
        item,
        stage: Transitions.Names.All.ENS_SET_RESOLVER,
        txThunk: async (nonce) => await ENS.attachSubDomainResolver(ensName, nonce)
      })
    
    case DeployStates.SETTING_CONTENT_ENS:
      if (!item.transitions.ipfs) throw new Error("handleContentTransitions should never be called on a deployment missing an IPFS transition object.");
      const ipfsHash = item.transitions.ipfs.hash;
      return await handleTxTransitions({
        item,
        stage: Transitions.Names.All.ENS_SET_CONTENT,
        txThunk: async (nonce) => await ENS.addIpfsToResolver(ensName, ipfsHash, nonce)
      })
    
    case DeployStates.PROPAGATING:
      return await handlePropagationTransition(item);

    case DeployStates.AVAILABLE:
      console.log(`Received a message about ${ensName}, which is already available.  No-op.`)
      return new Promise((res) => res());

    default:
      return (body: any) => Promise.reject({ message: `Unrecognized state transition for processing` });
  }
}

interface TxTransitionConfig {
  item:DeployItem, 
  stage:Transitions.Names.Ens, 
  txThunk:(nonce:number) => Promise<string>
}

async function handleTxTransitions(transitionConfig:TxTransitionConfig) {
  const { item, stage, txThunk } = transitionConfig;
  const { ensName } = item;
  const transition = item.transitions[stage];
  const transitionFxn = EnsTransitionFxns[stage];
  if (!transition) {
    const chainNonce = await web3.eth.getTransactionCount(ethAddress);
    const savedNonce = await DynamoDB.getNextNonceEthereum();
    if (chainNonce === savedNonce) {
      const txHash:string = await txThunk(savedNonce);
      const addRes = await transitionFxn.add(ensName, txHash, savedNonce);
      const incrementRes = await DynamoDB.incrementNextNonceEthereum()
      console.log(`Added ${stage} transition of ${ensName} w/ nonce ${savedNonce} & txHash ${txHash}: `,addRes)
    } else {
      console.log('Still waiting for a previous transaction to mine, retrying in 30s.');
    }
  } else {
    const txHash = transition.txHash;
    const txReceipt = await web3.eth.getTransaction(txHash)
    const txBlocknum = txReceipt.blockNumber;
    if (typeof txBlocknum === 'number') {
      const blockTimestamp = await getBlockTimestamp(txBlocknum);
      const confirmRes = await transitionFxn.complete(ensName, txBlocknum, blockTimestamp.toISOString());
      console.log(`Confirmed ${stage} transition of ${ensName} on blockNum ${txBlocknum} at ${blockTimestamp.toISOString()}: `, confirmRes);
    } else {
      console.log('Still waiting for this transaction to be confirmed, retrying in 30s.');
    }
  }
  SQS.sendMessage(item.ensName, 30);
}

async function handlePropagationTransition(item:DeployItem) {
  if (!item.transitions.ipfs) {
    throw new Error('handlePropagationTransitions should never be called on an item missing its transitions.ipfs object.')
  }
  let ipfsPropagated = await IPFS.read(item.transitions.ipfs.hash);
  let ensPropagated = await ENS.isNameAvailable(item.ensName);

  if (ipfsPropagated.exists && ensPropagated) {
    const finalTransition = await DynamoDB.updateDeployItem(item.ensName, (item) => {
      item.state = DeployStates.AVAILABLE;
      return item;
    })
    const deletedPipeline = await CodePipeline.delete(item.codepipelineName);
    return successResponse({
      message: `Successfully transitioned ${item.ensName} to AVAILBLE and deleted its CodePipeline.`
    })
  } else {
    // Wait a minute & check again
    console.log(`IPFS & ENS propagation for ${item.ensName} still incomplete; retrying in 60s.`)
    SQS.sendMessage(item.ensName, 60);
  }
}

export default DeployEns;
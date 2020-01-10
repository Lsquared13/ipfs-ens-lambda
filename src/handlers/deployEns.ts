import { SQSEvent, SQSRecord } from '@eximchain/api-types/spec/events';
import { successResponse, unexpectedErrorResponse } from '@eximchain/api-types/spec/responses';
import { DynamoDB, isTxConfirmed, nonceReady, SQS } from "../services"
import { DeployItem, DeployStates } from '@eximchain/ipfs-ens-types/spec/deployment';
import { ensRootDomain } from '../env';

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
    throw unexpectedErrorResponse(err);
  }

}

async function processRecord(record: SQSRecord) {

  //Retrieve DDB state to figure out what to do
  let body: SqsMessageBody = JSON.parse(record.body);
  let item = await DynamoDB.getDeployItem(body.EnsName);

  if (item == null) {
    //TODO: RETRY SQS MESSAGE 
    return Error("failed to fetch database record")
  }

  switch (item.state) {
    case DeployStates.REGISTERING_ENS:
      return await handleRegisterTransitions(item);
    
    case DeployStates.SETTING_RESOLVER_ENS:
      return await handleResolverTransitions(item);
    
    case DeployStates.SETTING_CONTENT_ENS:
      return await handleContentTransitions(item);
    
    case DeployStates.PROPAGATING:
      return await handlePropagationTransitions(item);

    case DeployStates.AVAILABLE:
      return new Promise((res) => res());

    default:
      return (body: any) => Promise.reject({ message: `Unrecognized state transition for processing` });
  }
}

async function handleRegisterTransitions(item:DeployItem) {
  const transition = item.transitions.ensRegister;
  // Do we have an object with a transaction hash?
  if (!transition) {
    const addressReady = await nonceReady();
    if (addressReady) {
      // Make this transaction happen

      // Update object w/ hash & nonce
      
    }
  } else {
    const txHash = transition.txHash;
    const txConfirmed = await isTxConfirmed(txHash);
    if (txConfirmed) {
      // Yes: Update current transition object with confirmation
      // timestamp, then update state to the next one
    }
  }
  SQS.sendMessage(item.ensName, 30);
}

async function handleResolverTransitions(item:DeployItem) {
  const transition = item.transitions.ensSetResolver;
  if (!transition) {
    const addressReady = await nonceReady();
    if (addressReady) {
      // Make this transaction happen

      // Update object with hash & nonce

    }
  } else {
    const txHash = transition.txHash;
    const txConfirmed = await isTxConfirmed(txHash);
    if (txConfirmed) {
      // Update object w/ timestamp & blockNum

      // Update state to Content
      
    }
  }
  SQS.sendMessage(item.ensName, 30);
}

async function handleContentTransitions(item:DeployItem) {
  const transition = item.transitions.ensSetContent;
  if (!transition) {
    const addressReady = await nonceReady();
    if (addressReady) {
      // Make this transaction happen

      // Update object w/ hash & nonce
      
    }
  } else {
    const txHash = transition.txHash;
    const txConfirmed = await isTxConfirmed(txHash);
    if (txConfirmed) {
      // Yes: Update current transition object with confirmation
      // timestamp, then update state to the next one
    }
  }
  SQS.sendMessage(item.ensName, 30);
}

async function handlePropagationTransitions(item:DeployItem) {
  if (!item.transitions.ipfs) {
    throw new Error('handlePropagationTransitions should never be called on an item missing its transitions.ipfs object.')
  }
  const domainName = `${item.ensName}.${ensRootDomain}.eth`;
  const ipfsHash = item.transitions.ipfs;
  // TODO: Check that IPFS hash is available & ENS name resolves

  const propagated = false;
  if (propagated) {
    // TODO: If propagation is complete:
    //   1. Transition object to AVAILABLE
    //   2. Delete the associated CodePipeline.
    //   3. Delete the associated S3 artifact bucket.
  } else {
    // Wait a minute & check again
    SQS.sendMessage(item.ensName, 60);
  }
}

export default DeployEns;
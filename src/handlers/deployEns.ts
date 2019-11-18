import { SQSEvent, SQSRecord } from "../types/lambda-event-types/";
import processor from './processor';
import { successResponse, unexpectedErrorResponse } from '@eximchain/dappbot-types/spec/responses';
import {DeployStates, SqsMessageBody} from '../types/deployment'
import {DynamoDB} from "../services"
import { web3Provider, web3 } from '../services/web3';

/**
 * invariant: this Lambda function feeds from an SQS trigger with Batch Size set to one (only one record in each event)
 * @param event 
 */
const DeployEns = async(event:SQSEvent) => {
  console.log("DeployEns request: "+JSON.stringify(event));

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

function stateProcessor(state:any) {
  // CHECK NONCE 
  // CHECK GAS PRICE IF FAILS SET DEFAULT
  // CHECK PENDING TRANSACTIONS
  // SPEED UP PENDING TRANSACTIONS
  switch(state) {
      case 'register-sub-domain':
            // TODO: Else if we have a new transaction, submit it, record
            // the receipt/nonce/timestamp in state, write a delayed 
            // retry message, & exit.
          return processor.create;
      case 'register-ens-registrar':
             // TODO: If last transaction isn't finished, write a delayed
            // retry onto the queue and then exit.
          return processor.update;
      case 'register-ipfs-hash':
            // TODO: If last transaction is complete:
            //   1. Write that into state 
            //   2. Delete the associated CodePipeline.
            //   3. Delete the associated S3 artifact bucket.
          return processor.delete;
      default:
          return (body:any) => Promise.reject({message: `Unrecognized state transition for processing`});
  }
}


async function processRecord(record:SQSRecord) {

  //Retrieve DDB state to figure out what to do
  let body:SqsMessageBody = JSON.parse(record.body);
  let ddbResponse = await DynamoDB.getDeployItem(body.EnsName);
  
  
  if (ddbResponse == null) {
    //TODO: RETRY SQS MESSAGE 
    return Error("failed to fetch database record")
  }

  const {packageDir, buildDir, owner, repo, branch, ensName,email, createdAt, updatedAt, codepipelineName, state} = ddbResponse
  
  //Reduce state and state transition
  let recordProcessor = stateProcessor(state);

  //Pass DDBResponse into state transition function
  return recordProcessor(ddbResponse);
}




export default DeployEns;
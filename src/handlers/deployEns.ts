import { SQSEvent, SQSRecord } from "../types/lambda-event-types/";
import processor from './processor';
import { successResponse, unexpectedErrorResponse } from '@eximchain/dappbot-types/spec/responses';


/**
 * invariant: this Lambda function feeds from an SQS trigger with Batch Size set to one (only one record in each event)
 * @param event 
 */
const DeployEns = async(event:SQSEvent) => {
  console.log("DeployEns request: "+JSON.stringify(event));
  // TODO: Process each record
  let records = event.Records;
  let processRecordsPromise = Promise.all(records.map(processRecord));

  try {
      let result = await processRecordsPromise;
      return successResponse(result);
  } catch (err) {
      throw unexpectedErrorResponse(err);
  }

}

async function processRecord(record:SQSRecord) {
  let method = record.messageAttributes.Method.stringValue;
  let body = JSON.parse(record.body);
  //TODO: destructure
  // const {} = body
  // TODO: Get ensName out of record to retrieve the DDB record


  let recordProcessor = methodProcessor(method);
  return recordProcessor(body);
}

function methodProcessor(method:any) {
  switch(method) {
      case 'create':
            // TODO: Else if we have a new transaction, submit it, record
            // the receipt/nonce/timestamp in state, write a delayed 
            // retry message, & exit.
          return processor.create;
      case 'retry':
             // TODO: If last transaction isn't finished, write a delayed
            // retry onto the queue and then exit.
          return processor.update;
      case 'delete':
            // TODO: If last transaction is complete:
            //   1. Write that into state 
            //   2. Delete the associated CodePipeline.
            //   3. Delete the associated S3 artifact bucket.
          return processor.delete;
      default:
          return (body:any) => Promise.reject({message: `Unrecognized method name ${method} for processing '${dappName}'`});
  }
}


export default DeployEns;
import { SQSEvent } from "../types/lambda-event-types/";

const DeployEns = async(event:SQSEvent) => {
  console.log("DeployEns request: "+JSON.stringify(event));
  console.warn("NOT IMPLEMENTED");

  // TODO: Process each record
  event.Records.forEach((record) => {

    // TODO: Get ensName out of record to retrieve the DDB record

    // TODO: If last transaction isn't finished, write a delayed
    // retry onto the queue and then exit.

    // TODO: Else if we have a new transaction, submit it, record
    // the receipt/nonce/timestamp in state, write a delayed 
    // retry message, & exit.

    // TODO: If last transaction is complete, write that into
    // state and then exit.
  })
}

export default DeployEns;
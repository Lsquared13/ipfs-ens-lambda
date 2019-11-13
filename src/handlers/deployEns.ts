import { APIGatewayEvent } from "../gateway-event-type";

const DeployEns = async(event:APIGatewayEvent) => {
  console.log("ensDeployHandler request: "+JSON.stringify(event));
  console.log("NOT IMPLEMENTED");

  // TODO: Check state of most recent deployment

  // TODO: If last transaction isn't finished, write a delayed
  // retry onto the queue and then exit.

  // TODO: Else if we have a new transaction, submit it, record
  // the receipt in state, write a delayed retry message, & exit.

  // TODO: If last transaction is complete, write that into
  // state and then exit.
}

export default DeployEns;
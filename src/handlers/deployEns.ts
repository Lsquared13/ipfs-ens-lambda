import { APIGatewayEvent } from "../gateway-event-type";

const DeployEns = async(event:APIGatewayEvent) => {
  console.log("ensDeployHandler request: "+JSON.stringify(event));
  console.log("NOT IMPLEMENTED");
}

export default DeployEns;
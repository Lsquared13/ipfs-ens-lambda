import { APIGatewayEvent } from "../gateway-event-type";

const DeployStart = async(event:APIGatewayEvent) => {
  console.log("startDeployHandler request: "+JSON.stringify(event));
  console.log("NOT IMPLEMENTED");
}

export default DeployStart;
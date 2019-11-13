import { APIGatewayEvent } from "../types/lambda-types/api-gateway-event-type";

const DeployStart = async(event:APIGatewayEvent) => {
  console.log("startDeployHandler request: "+JSON.stringify(event));
  console.log("NOT IMPLEMENTED");

  // TODO: Initialize any per-deploy state

  // TODO: Write the ENS name & build directory
  // into the S3 bucket

  // TODO: Create the CodePipeline with GitHub Source
  // based on the provided owner/repo/branch.
}

export default DeployStart;
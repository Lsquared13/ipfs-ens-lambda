import { isDeploySeed, newDeploySeed, APIGatewayEvent } from "../types";
import { userErrorResponse } from "@eximchain/dappbot-types/spec/responses";

const DeployStart = async(event:APIGatewayEvent) => {
  console.log("startDeployHandler request: "+JSON.stringify(event));
  console.log("NOT IMPLEMENTED");

  // Validate arguments
  const body = event.body ? JSON.parse(event.body) : {};
  if (!isDeploySeed(body)) return userErrorResponse({
    message: `Please include all of the required keys: ${Object.keys(newDeploySeed()).join(', ')}`
  })

  // TODO: Initialize any per-deploy state


  // TODO: Write the ENS name & build directory
  // into the S3 bucket

  // TODO: Create the CodePipeline with GitHub Source
  // based on the provided owner/repo/branch.
}

export default DeployStart;
import { isDeploySeed, newDeploySeed, APIGatewayEvent } from "../types";
import { S3, Dynamo, CodePipeline } from '../services';
import { userErrorResponse, unexpectedErrorResponse, successResponse } from "@eximchain/dappbot-types/spec/responses";

const DeployStart = async (event: APIGatewayEvent) => {
  console.log("DeployStart request: " + JSON.stringify(event));

  // Validate arguments
  const body = event.body ? JSON.parse(event.body) : {};
  if (!isDeploySeed(body)) return userErrorResponse({
    message: `Please include all of the required keys: ${Object.keys(newDeploySeed()).join(', ')}`
  })

  try {
    // Initialize DeployItem in DynamoDB
    const newItem = await Dynamo.initDeployItem(body);

    // Initialize seed into s3 deploySeed bucket
    const savedSeed = await S3.putDeploySeed(body)

    // Create new CodePipeline's artifact bucket
    const artifactBucketname = 'placeholder';
    const createdBucket = await S3.createBucket(artifactBucketname);

    // Create the CodePipeline with GitHub & S3 Source
    // based on the provided owner/repo/branch.
    const pipelineName = 'placeholder';
    const oauthToken = event.headers['Authorization']
    const createdPipeline = await CodePipeline.createDeploy(pipelineName, body, oauthToken, artifactBucketname)
    return successResponse({ newItem, savedSeed, createdBucket, createdPipeline });
  } catch (err) {
    return unexpectedErrorResponse(err);
  }

}

export default DeployStart;
import uuid from 'uuid/v4';
import { isDeploySeed, newDeploySeed, APIGatewayEvent } from "../types";
import { S3, DynamoDB, CodePipeline } from '../services';
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
    const deploymentSuffix = uuid();
    const newItem = await DynamoDB.initDeployItem(body);

    // Initialize seed into s3 deploySeed bucket
    const savedSeed = await S3.putDeploySeed(body)

    // Create new CodePipeline's artifact bucket
    const artifactBucketname = `ipfs-ens-artfacts-${deploymentSuffix}`;
    const createdBucket = await S3.createBucket(artifactBucketname);

    // Create the CodePipeline with GitHub & S3 Source
    // based on the provided owner/repo/branch.
    const pipelineName = `ipfs-ens-builder-${deploymentSuffix}`;
    const oauthToken = event.headers['Authorization']
    const createdPipeline = await CodePipeline.createDeploy(pipelineName, body, oauthToken, artifactBucketname)
    return successResponse({ newItem, savedSeed, createdBucket, createdPipeline });
  } catch (err) {
    return unexpectedErrorResponse(err);
  }

}

export default DeployStart;
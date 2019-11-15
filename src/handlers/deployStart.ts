import uuid from 'uuid/v4';
import { isDeployArgs, newDeployArgs, APIGatewayEvent } from "../types";
import { S3, DynamoDB, CodePipeline } from '../services';
import { userErrorResponse, unexpectedErrorResponse, successResponse } from "@eximchain/dappbot-types/spec/responses";

const DeployStart = async (event: APIGatewayEvent) => {
  console.log("DeployStart request: " + JSON.stringify(event));

  // Validate arguments
  const body = event.body ? JSON.parse(event.body) : {};
  if (!isDeployArgs(body)) return userErrorResponse({
    message: `Please include all of the required keys: ${Object.keys(newDeployArgs()).join(', ')}`
  })
  const { ensName, packageDir, buildDir, owner, repo, branch } = body;

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
    const createdPipeline = await CodePipeline.createDeploy(ensName, pipelineName, packageDir, buildDir, oauthToken, owner, repo, branch)
    return successResponse({ newItem, savedSeed, createdBucket, createdPipeline });
  } catch (err) {
    return unexpectedErrorResponse(err);
  }

}

export default DeployStart;
import uuid from 'uuid/v4';
import { isDeployArgs, newDeployArgs } from '@eximchain/ipfs-ens-types/spec/deployment';
import { ReadDeployment } from '@eximchain/ipfs-ens-types/spec/methods/private';
import { APIGatewayEvent } from '@eximchain/api-types/spec/events';
import { S3, DynamoDB, CodePipeline } from '../services';
import { userErrorResponse, unexpectedErrorResponse, successResponse, HttpMethods } from '@eximchain/api-types/spec/responses';

const DeployProxyApi = async (event: APIGatewayEvent) => {
  console.log("DeployStart request: " + JSON.stringify(event));
  const deployName = event.pathParameters['proxy'];
  const method = event.httpMethod.toUpperCase() as HttpMethods.ANY;
  switch (method) {
    case 'OPTIONS':
      return successResponse(null);
    case 'POST':
      const body = JSON.parse(event.body || '');
      const authToken = event.headers['Authorization']
      return createDeploy(body, authToken);
    case 'GET':
      return getDeploy(deployName);
    default:
      return userErrorResponse({ message: `Unrecognized HTTP method: ${method}` })
  }
}

async function createDeploy(args: any, oauthToken: string) {
  if (!isDeployArgs(args)) return userErrorResponse({
    message: `Please include all of the required keys: ${Object.keys(newDeployArgs()).join(', ')}`
  })
  const { ensName, packageDir, buildDir, owner, repo, branch } = args;

  try {
    // Initialize DeployItem in DynamoDB
    throw new Error(`Bailing out of logic for testing, deployStart received following arg body: ${JSON.stringify(args, null, 2)}`);
    const deploymentSuffix = uuid();
    const newItem = await DynamoDB.initDeployItem(args);

    // Create new CodePipeline's artifact bucket
    const artifactBucketname = `ipfs-ens-artfacts-${deploymentSuffix}`;
    const createdBucket = await S3.createBucket(artifactBucketname);

    // Create the CodePipeline with GitHub & S3 Source
    // based on the provided owner/repo/branch.
    const pipelineName = `ipfs-ens-builder-${deploymentSuffix}`;
    const createdPipeline = await CodePipeline.createDeploy(ensName, pipelineName, packageDir, buildDir, oauthToken, owner, repo, branch)
    return successResponse({ newItem, createdBucket, createdPipeline });
  } catch (err) {
    return unexpectedErrorResponse(err);
  }
}

async function getDeploy(deployName: string) {
  try {
    const item = await DynamoDB.getDeployItem(deployName);
    const result = item ? {
      item, exists: true
    } : {
        item, exists: false
      }
    return successResponse(result);
  } catch (err) {
    return unexpectedErrorResponse(err);
  }
}

export default DeployProxyApi;
import uuid from 'uuid/v4';
import { isDeployArgs, newDeployArgs } from '@eximchain/ipfs-ens-types/spec/deployment';
import { APIGatewayEvent } from '@eximchain/api-types/spec/events';
import { S3, DynamoDB, CodePipeline } from '../services';
import { userErrorResponse, unexpectedErrorResponse, successResponse, HttpMethods } from '@eximchain/api-types/spec/responses';

const DeployProxyApi = async (event: APIGatewayEvent) => {
  console.log("DeployStart request: " + JSON.stringify(event));
  const method = event.httpMethod.toUpperCase() as HttpMethods.ANY;
  switch (method) {
    case 'OPTIONS':
      return successResponse({});
    case 'POST':
      const body = JSON.parse(event.body || '');
      const authToken = event.headers['Authorization']
      return createDeploy(body, authToken);
    case 'GET':
      if (event.pathParameters) {
        const deployName = event.pathParameters['proxy'];
        return getDeploy(deployName);
      } else {
        return listDeploys()
      }
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
    const deploymentSuffix = uuid();
    const username = 'TODO: Connect authorizer';
    const pipelineName = `ipfs-ens-builder-${deploymentSuffix}`;
    const newItem = await DynamoDB.initDeployItem(args, username, pipelineName);    
    const createdPipeline = await CodePipeline.createDeploy(ensName, pipelineName, packageDir, buildDir, oauthToken, owner, repo, branch)

    return successResponse({ newItem, createdPipeline });
  } catch (err) {
    return unexpectedErrorResponse(err);
  }
}

async function listDeploys(){
  // TODO: Make this search via username
  try {
    const items = await DynamoDB.listDeployItems();
    const result = {
      items, count: items.length
    }
    return successResponse(result);
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
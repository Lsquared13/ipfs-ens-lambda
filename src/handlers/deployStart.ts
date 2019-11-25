import uuid from 'uuid/v4';
import { isDeployArgs, newDeployArgs, GitTypes } from '@eximchain/ipfs-ens-types/spec/deployment';
import { APIGatewayEvent } from '@eximchain/api-types/spec/events';
import { S3, DynamoDB, CodePipeline } from '../services';
import { userErrorResponse, unexpectedErrorResponse, successResponse, HttpMethods } from '@eximchain/api-types/spec/responses';

const DeployProxyApi = async (event: APIGatewayEvent) => {
  console.log("DeployStart request: " + JSON.stringify(event));
  const method = event.httpMethod.toUpperCase() as HttpMethods.ANY;
  if (method === 'OPTIONS') return successResponse({});
  const user:GitTypes.User = JSON.parse(event.requestContext.authorizer.githubUserInfo)
  const username = user.name;
  switch (method) {
    case 'POST':
      const body = JSON.parse(event.body || '');
      const authToken = event.headers['Authorization']
      return createDeploy(body, authToken, username);
    case 'GET':
      if (event.pathParameters) {
        const deployName = event.pathParameters['proxy'];
        return getDeploy(deployName, username);
      } else {
        return listDeploys(username)
      }
    default:
      return userErrorResponse({ message: `Unrecognized HTTP method: ${method}` })
  }
}

async function createDeploy(args: any, oauthToken: string, username:string) {
  if (!isDeployArgs(args)) return userErrorResponse({
    message: `Please include all of the required keys: ${Object.keys(newDeployArgs()).join(', ')}`
  })
  try {
    const { ensName, packageDir, buildDir, owner, repo, branch } = args;
    const deploymentSuffix = uuid();
    const pipelineName = `ipfs-ens-builder-${deploymentSuffix}`;
    const newItem = await DynamoDB.initDeployItem(args, username, pipelineName);    
    const createdPipeline = await CodePipeline.createDeploy(ensName, pipelineName, packageDir, buildDir, oauthToken, owner, repo, branch)
    return successResponse({ newItem, createdPipeline });
  } catch (err) {
    return unexpectedErrorResponse(err);
  }
}

/**
 * @param username 
 */
async function listDeploys(username:string){
  try {
    const items = await DynamoDB.listDeployItems(username);
    const result = {
      items, count: items.length
    }
    return successResponse(result);
  } catch (err) {
    return unexpectedErrorResponse(err);
  }
}

async function getDeploy(deployName: string, username:string) {
  try {
    const item = await DynamoDB.getDeployItem(deployName);
    if (!item || item.username !== username) return {
      item, exists: false
    }
    return successResponse({
      item, exists: true
    })
  } catch (err) {
    return unexpectedErrorResponse(err);
  }
}

export default DeployProxyApi;
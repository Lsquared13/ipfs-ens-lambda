import uuid from 'uuid/v4';
import { DeployArgs, isDeployArgs, newDeployArgs, GitTypes } from '@eximchain/ipfs-ens-types/spec/deployment';
import { APIGatewayEvent } from '@eximchain/api-types/spec/events';
import { S3, DynamoDB, CodePipeline, makeUserGitHub } from '../services';
import { userErrorResponse, unexpectedErrorResponse, successResponse, HttpMethods } from '@eximchain/api-types/spec/responses';
import { ReadDeployment, CreateDeployment, ListDeployments } from '@eximchain/ipfs-ens-types/spec/methods/private';
import { ensRootDomain } from '../env';

const DeployProxyApi = async (event: APIGatewayEvent) => {
  console.log("DeployStart request: " + JSON.stringify(event));
  const method = event.httpMethod.toUpperCase() as HttpMethods.ANY;
  if (method === 'OPTIONS') return successResponse({});
  const user: GitTypes.User = JSON.parse(event.requestContext.authorizer.githubUserInfo)
  const username = user.login;
  try {
    switch (method) {
      case 'POST':
        const body = JSON.parse(event.body || '');
        if (!isDeployArgs(body)) return userErrorResponse({
          message: `Please include all of the required keys: ${Object.keys(newDeployArgs()).join(', ')}`
        });
        const authToken = event.headers['Authorization']
        let createRes:CreateDeployment.Result = await createDeploy(body, authToken, username);
        return successResponse(createRes);
      case 'GET':
        if (event.pathParameters) {
          const deployName = event.pathParameters['proxy'];
          let getRes:ReadDeployment.Result = await getDeploy(deployName, username);
          return successResponse(getRes);
        } else {
          let listRes:ListDeployments.Result = await listDeploys(username)
          return successResponse(listRes);
        }
      default:
        return userErrorResponse({ message: `Unrecognized HTTP method: ${method}` })
    }
  } catch (err) {
    return unexpectedErrorResponse(err);
  }

}

async function createDeploy(args: DeployArgs, oauthToken: string, username: string):Promise<CreateDeployment.Result> {
  const { ensName, packageDir, buildDir, owner, repo, branch, envVars = {} } = args;
  const deploymentSuffix = uuid();
  const pipelineName = `ipfs-ens-builder-${deploymentSuffix}`;
  // TODO: Pin pipeline to specific ref
  const ref = await getBranchRef(oauthToken, owner, repo, branch);
  const newItem = await DynamoDB.initDeployItem(args, username, pipelineName);
  const createdPipeline = await CodePipeline.createDeploy(ensName, pipelineName, packageDir, buildDir, oauthToken, owner, repo, branch, envVars)
  return { message: `We successfully began your new deployment to ${ensName}.${ensRootDomain}.eth!  Please run "deployer read ${ensName}" for more details.` };
}

/**
 * @param oauthToken
 * @param owner
 * @param repo
 * @param branchNAme 
 */
async function getBranchRef(oauthToken: string, owner: string, repo: string, branch: string): Promise<string> {
  // TODO: Full implementation
  const GitHub = makeUserGitHub(oauthToken);
  let branchRes = await GitHub.repos.getBranch({owner, repo, branch});
  console.log(`Branch Result: ${branchRes}`)
  return '';
}

/**
 * @param username 
 */
async function listDeploys(username: string): Promise<ListDeployments.Result> {
  const items = await DynamoDB.listDeployItems(username);
  const result = {
    items, count: items.length
  }
  return result;
}

async function getDeploy(deployName: string, username: string): Promise<ReadDeployment.Result> {
  const item = await DynamoDB.getDeployItem(deployName);
  if (!item) {
    return {
      item, exists: false, owned: false
    }
  } else if (item.username !== username) {
    return {
      item: null, exists: true, owned: false
    }
  } else {
    return {
      item, exists: true, owned: true
    }
  }
}

export default DeployProxyApi;
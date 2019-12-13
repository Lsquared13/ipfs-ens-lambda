import { AWS, deployTableName, nonceTableName } from '../env';
import { addAwsPromiseRetries } from '../common';
import Chains from '@eximchain/api-types/spec/chains';
import { DeployArgs, DeployItem, DeployStates, SourceProviders, Transitions, nextDeployState } from '@eximchain/ipfs-ens-types/spec/deployment';
import { PutItemInputAttributeMap, QueryInput } from 'aws-sdk/clients/dynamodb';
import lodash from 'lodash';
import { pipeline } from 'stream';

const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

export const DynamoDB = {
  listDeployItems,
  initDeployItem,
  getDeployItem,
  getDeployItemByPipeline,
  updateDeployItem,
  setTransitionErr,
  addSourceTransition,
  addBuildTransition,
  addIpfsTransition,
  addEnsRegisterTransition,
  addEnsSetResolverTransition,
  addEnsSetContentTransition,
  completeEnsRegisterTransition,
  completeEnsSetResolverTransition,
  completeEnsSetContentTransition,
  getNextNonceEthereum,
  incrementNextNonceEthereum
}

export default DynamoDB;

/**
 * Given a deployArgs, create a record for it in the
 * deployTable.  Sets the `createdAt` and `updatedAt`
 * values to now.
 * @param deployArgs 
 */
function initDeployItem(deployArgs:DeployArgs, username:string, codepipelineName:string) {
  let maxRetries = 5;
  let now = new Date().toISOString();
  let deployItem = Object.assign(deployArgs, {
    createdAt: now,
    updatedAt: now,
    state: DeployStates.FETCHING_SOURCE,
    transitions: {},
    username, codepipelineName
  });
  let ddbItem = ddbFromDeployItem(deployItem);
  let putItemParams = {
    TableName: deployTableName,
    Item: ddbItem
  }
  console.log('Attempting to init DeployItem w/ req: ',putItemParams);
  return addAwsPromiseRetries(() => ddb.putItem(putItemParams).promise(), maxRetries);
}

/**
 * Get the deserialized DeployItem by ensName.
 * @param ensName 
 */
async function getDeployItem(ensName:string):Promise<DeployItem | null> {
  const ddbItem = await getRawDeployItem(ensName);
  if (!ddbItem.Item) return null;
  return deployItemFromDDB(ddbItem.Item);
}

async function getDeployItemByPipeline(pipelineName:string):Promise<DeployItem | null> {
  const ddbItem = await getRawDeployItemByPipeline(pipelineName);
  const { Count, Items } = ddbItem;
  if (!Count || !Items) return null;
  return deployItemFromDDB(Items[0]);
}

async function listDeployItems(username:string):Promise<DeployItem[]> {
  const ddbItems = await listRawDeployItems(username);
  return ddbItems.Items ? ddbItems.Items.map(deployItemFromDDB) : [];
}

type DeployUpdateFxn = (item:DeployItem) => DeployItem;
type DeployUpdater = Partial<DeployItem> | DeployUpdateFxn;

/**
 * Easily update a deploy item by providing an ensName
 * and an updater.  The updater can either be:
 * 
 * 1. an object with any of the keys you'd like to change
 * 2. a function which accepts the current DeployItem and
 *    returns your updated value.
 * 
 * The `updatedAt` field will always be auto-updated.
 * 
 * @param ensName 
 * @param updater 
 */
async function updateDeployItem(ensName:string, updater:DeployUpdater) {
  const currentItem = await getDeployItem(ensName);
  if (!currentItem) throw new Error(`Update error: No item found for ${ensName}`);
  let newItem:DeployItem;
  if (typeof updater === 'object') {
    newItem = Object.assign(currentItem, updater);
  } else {
    newItem = updater(currentItem)
  }
  newItem.updatedAt = new Date().toString()
  const updatedDDB = ddbFromDeployItem(newItem);
  return await putRawDeployItem(updatedDDB);
}

function serializeDeployItemKey(ensName:string) {
  let keyItem = {
      'EnsName': {S: ensName}
  };
  return keyItem;
}

function serializeDeployItemPipelineQuery(pipelineName:string) {
  let keyItem = {
    'CodepipelineName': {S : pipelineName}
  }
  return keyItem
}

function ddbFromDeployItem(deployItem:DeployItem) {
  // Gather parameters
  const { 
    buildDir, branch, ensName, owner, repo, createdAt, updatedAt,
    username, state, codepipelineName, transitions, sourceProvider,
    packageDir, transitionError
  } = deployItem;

  // Add required parameters
  const stringAttr = (val:string) => ({ S : val });
  const dbItem:PutItemInputAttributeMap = {
    'BuildDir': stringAttr(buildDir),
    'PackageDir': stringAttr(packageDir),
    'SourceProvider': stringAttr(sourceProvider),
    'Branch': stringAttr(branch),
    'Owner': stringAttr(owner),
    'Repo': stringAttr(repo),
    'EnsName': stringAttr(ensName),
    'CreatedAt': stringAttr(createdAt),
    'UpdatedAt': stringAttr(updatedAt),
    'Username': stringAttr(username),
    'Transitions': stringAttr(JSON.stringify(transitions)),
    'State': stringAttr(state),
    'CodepipelineName': stringAttr(codepipelineName)
  }
  if (transitionError) dbItem['TransitionError'] = stringAttr(JSON.stringify(transitionError))
  return dbItem;
}

function deployItemFromDDB(dbItem:PutItemInputAttributeMap):DeployItem {
  const { 
    BuildDir, Owner, Repo, Branch, EnsName, CreatedAt, UpdatedAt, Username,
    PackageDir, Transitions, State, CodepipelineName, SourceProvider, TransitionError
  } = dbItem;
  const deployItem:DeployItem = {
    buildDir: BuildDir.S as string,
    packageDir: PackageDir.S as string,
    owner: Owner.S as string,
    repo: Repo.S as string,
    branch: Branch.S as string,
    ensName: EnsName.S as string,
    createdAt: CreatedAt.S as string,
    updatedAt: UpdatedAt.S as string,
    username: Username.S as string,
    transitions: JSON.parse(Transitions.S as string),
    state: State.S as DeployStates,
    codepipelineName: CodepipelineName.S as string,
    sourceProvider: SourceProvider.S as SourceProviders
  };
  if (TransitionError) deployItem.transitionError = JSON.parse(TransitionError.S as string);
  return deployItem;
}

function getRawDeployItem(ensName:string) {
  let maxRetries = 5;
  let getItemParams = {
      TableName: deployTableName,
      Key: serializeDeployItemKey(ensName)
  };

  return addAwsPromiseRetries(() => ddb.getItem(getItemParams).promise(), maxRetries);
}

function getRawDeployItemByPipeline(pipelineName:string) {
  let maxRetries = 5;
  let getItemParams = {
    TableName: deployTableName,
    KeyConditionExpression: 'CodepipelineName = :pipeline',
    ExpressionAttributeValues: { ':pipelinename' : {S: pipelineName} }
  };

  return addAwsPromiseRetries(() => ddb.query(getItemParams).promise(), maxRetries);
}

/**
 * TODO: Currently ignores username argument, make it
 * actually filter once we're getting the username from
 * the authorizer.
 * 
 * @param username 
 */
async function listRawDeployItems(username:string) {
  let maxRetries = 5;
  const params:QueryInput = {
    TableName: deployTableName,
    IndexName: "UsernameIndex",
    KeyConditionExpression: "Username = :username",
    ExpressionAttributeValues: { 
      ':username': { 'S' : username } 
    }
  }
  return addAwsPromiseRetries(() => ddb.query(params).promise(), maxRetries);
}

function putRawDeployItem(item:PutItemInputAttributeMap) {
  let maxRetries = 5;
    let putItemParams = {
        TableName: deployTableName,
        Item: item
    };

    return addAwsPromiseRetries(() => ddb.putItem(putItemParams).promise(), maxRetries);
}

// Transitions

async function setTransitionErr(ensName:string, transition:Transitions.Names.All, message: string) {
  let now = new Date().toISOString();
  let itemUpdater = (item:DeployItem) => {
    let newItem = lodash.cloneDeep(item);
    newItem.transitionError = {
      transition, message, timestamp: now
    }
    return newItem;
  }
  return updateDeployItem(ensName, itemUpdater)
}

async function addPipelineTransition(transition:Transitions.Names.Pipeline, ensName:string, size:number) {
  let now = new Date().toISOString();
  let itemUpdater = (item:DeployItem) => {
    let newItem = lodash.cloneDeep(item);
    newItem.transitions[transition] = {
      timestamp: now,
      size: size
    };
    newItem.state = nextDeployState[item.state]
    return newItem;
  }

  return updateDeployItem(ensName, itemUpdater);
}

async function addSourceTransition(ensName:string, size:number) {
  return addPipelineTransition(Transitions.Names.All.SOURCE, ensName, size);
}

async function addBuildTransition(ensName:string, size:number) {
  return addPipelineTransition(Transitions.Names.All.BUILD, ensName, size);
}

async function addIpfsTransition(ensName:string, hash:string) {
  let now = new Date().toISOString();
  let itemUpdater = (item:DeployItem) => {
    let newItem = lodash.cloneDeep(item);
    newItem.transitions[Transitions.Names.All.IPFS] = {
      timestamp: now,
      hash: hash
    };
    newItem.state = nextDeployState[item.state];
    return newItem;
  }

  return updateDeployItem(ensName, itemUpdater);
}

async function addEnsTransition(transition:Transitions.Names.Ens,
                                ensName:string, txHash:string, nonce:number) {
  let now = new Date().toISOString();
  let itemUpdater = (item:DeployItem) => {
    let newItem = lodash.cloneDeep(item);
    newItem.transitions[transition] = {
      timestamp: now,
      txHash: txHash,
      nonce: nonce
    };
    return newItem;
  }

  return updateDeployItem(ensName, itemUpdater);
}

async function addEnsRegisterTransition(ensName:string, txHash:string, nonce:number) {
  return addEnsTransition(Transitions.Names.All.ENS_REGISTER, ensName, txHash, nonce);
}

async function addEnsSetResolverTransition(ensName:string, txHash:string, nonce:number) {
  return addEnsTransition(Transitions.Names.All.ENS_SET_RESOLVER, ensName, txHash, nonce);
}

async function addEnsSetContentTransition(ensName:string, txHash:string, nonce:number) {
  return addEnsTransition(Transitions.Names.All.ENS_SET_CONTENT, ensName, txHash, nonce);
}

async function completeEnsTransition(transition:Transitions.Names.Ens,
                                     ensName:string, blockNumber:number, confirmationTimestamp:string) {
  let itemUpdater = (item:DeployItem) => {
    let newItem = lodash.cloneDeep(item);
    newItem.transitions[transition] = Object.assign(newItem.transitions[transition], {
      blockNumber: blockNumber,
      confirmationTimestamp: confirmationTimestamp
    });
    newItem.state = nextDeployState[item.state];
    return newItem;
  }
                                    
  return updateDeployItem(ensName, itemUpdater);
}

async function completeEnsRegisterTransition(ensName:string, blockNumber:number, confirmationTimestamp:string) {
  return completeEnsTransition(Transitions.Names.All.ENS_REGISTER, ensName, blockNumber, confirmationTimestamp);
}

async function completeEnsSetContentTransition(ensName:string, blockNumber:number, confirmationTimestamp:string) {
  return completeEnsTransition(Transitions.Names.All.ENS_SET_CONTENT, ensName, blockNumber, confirmationTimestamp);
}

async function completeEnsSetResolverTransition(ensName:string, blockNumber:number, confirmationTimestamp:string) {
  return completeEnsTransition(Transitions.Names.All.ENS_SET_RESOLVER, ensName, blockNumber, confirmationTimestamp);
}

// Nonce Management

function serializeNonceItemKey(chain:Chains.Names) {
  let keyItem = {
      'Chain': {S: chain}
  };
  return keyItem;
}

function getRawNonceItem(chain:Chains.Names) {
  let maxRetries = 5;
  let getItemParams = {
      TableName: nonceTableName,
      Key: serializeNonceItemKey(chain)
  };

  return addAwsPromiseRetries(() => ddb.getItem(getItemParams).promise(), maxRetries);
}

function putRawNonceItem(item:PutItemInputAttributeMap) {
  let maxRetries = 5;
  let putItemParams = {
      TableName: nonceTableName,
      Item: item
  };

  return addAwsPromiseRetries(() => ddb.putItem(putItemParams).promise(), maxRetries);
}

async function getNextNonceForChain(chain:Chains.Names):Promise<number> {
  let nonceItem = await getRawNonceItem(chain);
  if (!nonceItem.Item) throw new Error(`Get nonce error: No nonce item found for ${chain}`);
  let nextNonce = nonceItem.Item.NextNonce.N;
  if (!nextNonce) throw new Error(`Get nonce error: No NextNonce found in item for  ${chain}`);
  return +nextNonce;
}

// Should be called immediately after sending a transaction with currentNonce
async function incrementNextNonceForChain(chain:Chains.Names, currentNonce:number) {
  let newNonce = currentNonce + 1;
  let currentNonceItem = await getRawNonceItem(chain);
  if (!currentNonceItem.Item) throw new Error(`Set nonce error: No nonce item found for ${chain}`);
  let newNonceItem = currentNonceItem.Item;
  let newNonceAttr = {'N': newNonce.toString()};
  newNonceItem.NextNonce = newNonceAttr;
  return await putRawNonceItem(newNonceItem);
}

async function getNextNonceEthereum():Promise<number> {
  return await getNextNonceForChain(Chains.Names.Ethereum);
}

async function incrementNextNonceEthereum(currentNonce:number) {
  return await incrementNextNonceForChain(Chains.Names.Ethereum, currentNonce);
}
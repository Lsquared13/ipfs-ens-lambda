import { AWS, deployTableName, nonceTableName } from '../env';
import { addAwsPromiseRetries } from '../common';
import Chains from '@eximchain/api-types/spec/chains';
import { DeployArgs, DeployItem, DeployStates, SourceProviders, Transitions } from '@eximchain/ipfs-ens-types/spec/deployment';
import { PutItemInputAttributeMap, ScanInput, QueryInput } from 'aws-sdk/clients/dynamodb';

const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

export const DynamoDB = {
  listDeployItems,
  initDeployItem,
  getDeployItem,
  updateDeployItem,
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
  let now = new Date().toString();
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

function ddbFromDeployItem(deployItem:DeployItem) {
  // Gather parameters
  const { 
    buildDir, branch, ensName, owner, repo, createdAt, updatedAt,
    username, state, codepipelineName, transitions, sourceProvider,
    packageDir
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

  return dbItem;
}

function deployItemFromDDB(dbItem:PutItemInputAttributeMap):DeployItem {
  const { 
    BuildDir, Owner, Repo, Branch, EnsName, CreatedAt, UpdatedAt, Username,
    PackageDir, Transitions, State, CodepipelineName, SourceProvider
  } = dbItem;
  const deployItem = {
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
  await putRawNonceItem(newNonceItem);
}

async function getNextNonceEthereum():Promise<number> {
  return await getNextNonceForChain(Chains.Names.Ethereum);
}

async function incrementNextNonceEthereum(currentNonce:number) {
  await incrementNextNonceForChain(Chains.Names.Ethereum, currentNonce);
}
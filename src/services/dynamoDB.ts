import { AWS, deployTableName } from '../env';
import { addAwsPromiseRetries } from '../common';
import { DeploySeed, DeployItem } from '../types';
import { PutItemInputAttributeMap } from 'aws-sdk/clients/dynamodb';

const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

export const DynamoDB = {
  initDeployItem,
  getDeployItem,
  updateDeployItem
}

export default DynamoDB;

/**
 * Given a deploySeed, create a record for it in the
 * deployTable.  Sets the `createdAt` and `updatedAt`
 * values to now.
 * @param deploySeed 
 */
function initDeployItem(deploySeed:DeploySeed) {
  let maxRetries = 5;
  let now = new Date().toString();
  let deployItem = Object.assign(deploySeed, {
    createdAt: now,
    updatedAt: now
  });
  let ddbItem = ddbFromDeployItem(deployItem);
  let putItemParams = {
    TableName: deployTableName,
    Item: ddbItem
  }
  return addAwsPromiseRetries(() => ddb.putItem(putItemParams).promise(), maxRetries);
}

/**
 * Get the deserialized DeployItem by ensName.
 * @param ensName 
 */
async function getDeployItem(ensName:string) {
  const ddbItem = await getRawDeployItem(ensName);
  if (!ddbItem.Item) return null;
  return deployItemFromDDB(ddbItem.Item);
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

function serializeDdbKey(ensName:string) {
  let keyItem = {
      'EnsName': {S: ensName}
  };
  return keyItem;
}

function ddbFromDeployItem(deployItem:DeployItem) {
  // Gather parameters
  const { buildDir, branch, ensName, owner, repo, createdAt, updatedAt } = deployItem;

  // Add required parameters
  const stringAttr = (val:string) => ({ S : val });
  const dbItem:PutItemInputAttributeMap = {
    'BuildDir': stringAttr(buildDir),
    'Branch': stringAttr(branch),
    'Owner': stringAttr(owner),
    'Repo': stringAttr(repo),
    'EnsName': stringAttr(ensName),
    'CreatedAt': stringAttr(createdAt),
    'UpdatedAt': stringAttr(updatedAt)
  }

  // Add optional parameters once we have em

  return dbItem;
}

function deployItemFromDDB(dbItem:PutItemInputAttributeMap) {
  const { BuildDir, Owner, Repo, Branch, EnsName, CreatedAt, UpdatedAt } = dbItem;
  const deployItem = {
    buildDir: BuildDir.S,
    owner: Owner.S,
    repo: Repo.S,
    branch: Branch.S,
    ensName: EnsName.S,
    createdAt: CreatedAt.S,
    updatedAt: UpdatedAt.S
  } as DeployItem;
  return deployItem;
}

function getRawDeployItem(ensName:string) {
  let maxRetries = 5;
  let getItemParams = {
      TableName: deployTableName,
      Key: serializeDdbKey(ensName)
  };

  return addAwsPromiseRetries(() => ddb.getItem(getItemParams).promise(), maxRetries);
}

function putRawDeployItem(item:PutItemInputAttributeMap) {
  let maxRetries = 5;
    let putItemParams = {
        TableName: deployTableName,
        Item: item
    };

    return addAwsPromiseRetries(() => ddb.putItem(putItemParams).promise(), maxRetries);
}


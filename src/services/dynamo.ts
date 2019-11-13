import { AWS, deployTableName } from '../env';
import { addAwsPromiseRetries } from '../common';
import { DeploySeed, DeployItem } from '../types';
import { PutItemInputAttributeMap } from 'aws-sdk/clients/dynamodb';

const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

export const Dynamo = {
  initDeployItem,
  deployItemFromDDB,
  ddbFromDeployItem
}

export default DynamoDB;

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

function updateDeployItem(update:Partial<DeployItem>) {

}
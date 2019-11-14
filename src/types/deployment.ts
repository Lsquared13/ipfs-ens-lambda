import { keysAreStrings } from '../validators';

/**
 * Barebones arguments required to create a deployment.
 * Sent to us by client, persisted in S3.
 */
export interface DeploySeed {
  buildDir: string
  owner: string
  repo: string
  branch: string
  ensName: string
}

export function isDeploySeed(val:any): val is DeploySeed {
  return keysAreStrings(val, ['buildDir', 'owner', 'repo', 'branch', 'ensName'])
}

export function newDeploySeed(){
  return {
    buildDir: '',
    owner: '',
    repo: '',
    branch: '',
    ensName: ''
  }
}

/**
 * Complete data representing a deployment, persisted
 * in our DynamoDB records.
 */
export interface DeployItem extends DeploySeed {
  createdAt: string
  updatedAt: string
}
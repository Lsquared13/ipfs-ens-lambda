import { keysAreStrings } from '../validators';

/**
 * Barebones arguments required to create a deployment.
 * Sent to us by client, persisted in S3.
 */
export interface DeployArgs {
  buildDir: string
  owner: string
  repo: string
  branch: string
  ensName: string
}

export function isDeployArgs(val:any): val is DeployArgs {
  return keysAreStrings(val, ['buildDir', 'owner', 'repo', 'branch', 'ensName'])
}

export function newDeployArgs(){
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
export interface DeployItem extends DeployArgs {
  createdAt: string
  updatedAt: string
}
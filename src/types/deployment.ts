import { keysAreStrings } from '../validators';

/**
 * Barebones arguments required to create a deployment.
 * Sent to us by client, persisted in S3.
 */
export interface DeployArgs {
  packageDir: string
  buildDir: string
  owner: string
  repo: string
  branch: string
  ensName: string
  email: string
}

export function isDeployArgs(val:any): val is DeployArgs {
  return keysAreStrings(val, ['packageDir', 'buildDir', 'owner', 'repo', 'branch', 'ensName'])
}

export function newDeployArgs():DeployArgs{
  return {
    packageDir: '',
    buildDir: '',
    owner: '',
    repo: '',
    branch: '',
    ensName: '',
    email: ''
  }
}


export enum DeployStates{

} 

export interface DeployTransition{

} 
/**
 * Complete data representing a deployment, persisted
 * in our DynamoDB records.
 */
export interface DeployItem extends DeployArgs {
  createdAt: string
  updatedAt: string
  codepipelineName: string
  state: DeployStates
  stateTransitionMessages: DeployTransition[]
  
}
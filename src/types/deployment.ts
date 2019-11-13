import { keysAreStrings } from '../validators';

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
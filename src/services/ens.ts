// @ts-ignore No types available yet for ethereum-ens
import ENS from 'ethereum-ens';
import { web3Provider } from './web3';

const ens = new ENS(web3Provider);

// Address of our own node, hosted.eth
const NODE_ADDR = 'placeholder';

// Address of public ENS resolver
const PUBLIC_RESOLVER_ADDR = '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8';

export async function isNameAvailable(name:string) {
  // ens.resolver(name) will throw ENS.NameNotFound if
  // nothing is there.
}

export async function makeSubDomain(name:string) {
  // ens.setSubnodeOwner()
}

export async function attachSubDomainResolver(name:string) {
  // ens.setResolver()
}

export async function addIpfsToResolver(name:string) {
  // ens.setContentHash()
}
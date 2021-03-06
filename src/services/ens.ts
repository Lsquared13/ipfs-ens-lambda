// @ts-ignore No types available yet for ethereum-ens
import ENSFactory from 'ethereum-ens';
import { TransactionReceipt } from 'web3-core';
import { web3Provider, web3 } from './web3';
import { defaultGasPrice, ensRootDomain } from '../env';
import { AbiType, StateMutabilityType } from 'web3-utils';


//TODO: Replace hard coded values with environment variables
const ethAddress = "0xDEAD7731e8531b4B653ab6bEDAB9C63762B1062d"
const PUBLIC_ENS_RESOLVER_ADDR = '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8';
const RESOLVER_ABI =  [
	{
		"constant": false,
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "node",
				"type": "bytes32"
			},
			{
				"internalType": "bytes",
				"name": "hash",
				"type": "bytes"
			}
		],
		"name": "setContenthash",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable" as StateMutabilityType,
		"type": "function" as AbiType
	}
]

// prepare contract instances
const ensLib = new ENSFactory(web3Provider);

//TODO: fetch gas price from eth gas station fall back on default
let ethGasEstimate;

var ensResolver = new web3.eth.Contract(RESOLVER_ABI, PUBLIC_ENS_RESOLVER_ADDR, {
  from: ethAddress, // default from address
  gasPrice: ethGasEstimate? ethGasEstimate: defaultGasPrice // default gas price in wei, 20 gwei in this case
});


export async function nonceOnChain(): Promise<number> {
  return await web3.eth.getTransactionCount(ethAddress);
}

export async function getBlockNumber(){
  try{
    const blocknumber = await web3.eth.getBlockNumber()
    return blocknumber
  }catch(e){
    return false
  }
}

export async function isNameAvailable(name:string) {
  const domain = `${name}.${ensRootDomain}.eth`
  try {
    const resolver = await ensLib.resolver(domain);
    const result = await resolver.addr();
    return result;
    
  } catch(error) {
    if (error instanceof ENSFactory.NameNotFound) {
      return false;
    } else {
      console.log(`Error resolving domain ${domain}: `,error);
      throw error;
    }
  }
}

/**
 * setSubnodeOwner sets the owner of the specified name. The calling account
 * must be the owner of the parent name in order for this call to succeed -
 * for example, to call setSubnodeOwner on 'foo.bar.eth', the caller must be
 * the owner of 'bar.eth'.
 * @param {string} name The name to update
 * @param {address} [address=hosted.eth]  The address of the new owner
 * @param {object} [options= {from: ethAddress}] An optional dict of parameters to pass to web3 defaults as { from: accounts[0] }
 * @returns A promise returning the transaction ID of the transaction, once mined.
 */
export async function makeSubDomain(name:string, nonce:number) {
  try {
    //Register the subdomain and assign the root domain address as owner to allow us to manage
    const result = await ensLib.setSubnodeOwner(`${name}.${ensRootDomain}.eth`, ethAddress, {
      nonce, from: ethAddress,
    });
      
    console.log(`\tSuccessfully set subdomain resolver. Transaction hash: ${result.tx}.`)
    return result;
    
  } catch(error) {
    throw Error(`Error performing setSubnodeOwner(): ${error}`)

  }
  
}

/**
 * setResolver sets the address of the resolver contract for the specified name.
 * The calling account must be the owner of the name in order for this call to
 * succeed.
 * @param {string} name The name to update
 * @param {address} [address=resolver.eth]  The address of the resolver, On mainnet and the Kovan test network, 'resolver.eth' is configured to point to the latest deployed version of the public resolver
 * @param {object}  [options= {from: ethAddress}] An optional dict of parameters to pass to web3. defaults as { from: accounts[0] }
 * @returns A promise that returns the transaction ID when the transaction is mined.
 */
export async function attachSubDomainResolver(name:string, nonce:number) {
  try {
    // console.log(    web3.eth.personal.unlockAccount(ethAddress,"",1000))
    //Get resolver for root domain
    const resolver = await ensLib.resolver('resolver.eth').addr();
    //Set the subdomain resolver to the same
    const result = await ensLib.setResolver(name, resolver, {nonce, from: ethAddress});
    
    console.log(`\tSuccessfully set subdomain resolver. Transaction hash: ${result.tx}.`)
    return result;
    
  } catch(error) {
    throw Error(`Error performing setResolver(): ${error}`)

  }
  
}
 
 /**
 * addIpfsToResolver sets the content hash for the speficied subdomain.
 * The calling account must be the owner of the name in order for this call to
 * succeed. NOTE: if not use contentHash.fromIpfs(ipfsHash) from https://www.npmjs.com/package/content-hash
 * @param {string} name subdomain
 * @param {string} ipfsHash looks like 'QmRAQB6YaCyidP37UdDnjFY5vQuiBrcqdyoW1CuDgwxkD4' ommit prefix
 */
export async function addIpfsToResolver(name:string, ipfsHash: string, nonce:number) {
  // Calculate the name hash & the encoded content hash
  let node = ensLib.namehash.hash(`${name}.${ensRootDomain}.eth`); 
  const hash = ensLib.contentHash.fromIpfs(ipfsHash);

  try {
    let result:TransactionReceipt = await ensResolver.methods.setContenthash(node, hash, {nonce, from: ethAddress})
    console.log('setContenthash receipt: ',result);
    console.log(`\tSuccessfully stored new contentHash. Transaction hash: ${result.transactionHash}.`)
    return result.transactionHash;
  } catch(error) {
    throw Error(`Error performing setContenthash(): ${error}`)
  }
  
}

export const ENS = {
  getBlockNumber         : getBlockNumber,
  isNameAvailable        : isNameAvailable,
  makeSubDomain          : makeSubDomain,
  attachSubDomainResolver: attachSubDomainResolver,
  addIpfsToResolver      : addIpfsToResolver,
  ensResolverContract    : ensResolver,
  ensContract            : {} 
}

export default ENS;
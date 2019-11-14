import IPFSClient from 'ipfs-http-client';
import { operationNotImplemented } from '../common';

/**
 * Given a Buffer, write it to Inufra & return the `hash`
 * @param content 
 */
async function ipfsCreate(content:Buffer):Promise<string>{
  const ipfs = IPFSClient('ipfs.infura.io', 5001, { protocol: 'https' });
  const results = await ipfs.add(content);
  const hash = results[0].hash;
  return hash;
}

/**
 * TODO: Check if there is IPFS file at `hash`
 * @param hash 
 */
async function ipfsRead(hash:string) {
  return operationNotImplemented()
}

/**
 * TODO: Useful for retyring from another noode
 * 1. Check if a file exists at the hash
 * 2. Error if one is present
 * 3. Uploads file if not
 * @param hash 
 */
async function ipfsUpdate(hash:string) {
  return operationNotImplemented();
}

/**
 * TODO: Can't delete once it's on network, fail gracefully
 * @param hash 
 */
async function ipfsDelete(hash:string) {
  return operationNotImplemented();
}

/**
 * List IPFS info about file if it exists
 * @param hash 
 */
async function ipfsList(hash:string) {
  return operationNotImplemented();
}

export const IPFS = {
  create: ipfsCreate,
  read: ipfsRead,
  update: ipfsUpdate,
  delete: ipfsDelete,
  list: ipfsList
}

export default IPFS;
import ipfshttpclient from 'ipfs-http-client';
// @ts-ignore ipfs-utils is not typed
import { globSource } from 'ipfs-utils';
import { operationNotImplemented } from '../common';
import { Readable } from 'stream';
import shell from 'shelljs';
import unzipper from 'unzipper';

const ipfsClient = new ipfshttpclient('ipfs.infura.io', 5001, { protocol: 'https' });

interface ipfsCreateResponse{
  hash?: string
  path?:string
  size?:number
  error?:boolean
  errorObject?: Error
}
/**
 * Given a Buffer, write it to Inufra & return the `hash`
 * @param content 
 */
async function ipfsCreate(content:Readable):Promise<ipfsCreateResponse>{
  return new Promise(async (resolve, reject) => {
    try{
      content.pipe(unzipper.Extract({
        path: '/tmp/build'
      })).on('close', async () => {
        // All files should now exist in /tmp/build...
        shell.cd('/tmp/build');
        console.log('List of files now available in /tmp/build:')
        console.log(shell.ls('-R'));
        const options = { recursive: true, hidden: true };
        const globPaths = globSource('./', options)
        console.log('globPaths: ',globPaths);
        for await (let eachPath of globPaths) {
          console.log('GlobPaths found ',eachPath);
        }
        const allResults = [];
        // @ts-ignore Using method which is not yet specified.
        const results = ipfsClient.addFromFs('./', { 
          ...options,
          progress: (byteLength:any) => {console.log(`Added chunk to IPFS w/ byteLength ${byteLength.toString()}`)}
        });
        console.log('Results without await or loop: ',results);
        for await (let result of results) {
          console.log('Heard about a result from IPFS client: ',result);
          allResults.push(result);
        }
        console.log('Num Results: ',results.length);
        if (results.length === 0) throw new Error('No results from add');
        console.log('All Results: ',results);
        resolve(results[results.length - 1]);
      })
  
      // const result = await ipfsClient.add(content, {pin:true});
      // console.log('Result inside of ipfsCreate: ',result);
      // const {path, hash, size} = result[0];
      // return {path, hash, size};
    }catch(e){
      reject({
        error: true,
        errorObject: new Error(e)
      });
    }
  })
}

interface ipfsReadResponse {
  cat? :string
  exists? : boolean
  error?:boolean
  errorObject?: Error

}
/**
 * TODO: Check if there is IPFS file at `hash`
 * @param hash  base58 encoded string representing IPFS hash like: 'QmXEmhrMpbVvTh61FNAxP9nU7ygVtyvZA8HZDUaqQCAb66"
 */
async function ipfsRead(hash:string): Promise<ipfsReadResponse> {
  try{
    const results = await ipfsClient.cat(`/ipfs/${hash}`,{offset:0 ,length:2})
    const cat = results.toString();
    const exists = cat? true: false;
    return {
      cat: cat,
      exists: exists
    }

  }catch(e){
    if (e == "Request timed out"){return {
        exists: false,
        error: true,
        errorObject: new Error(e)
      }
    }else{
      return {
        exists: false,
        error: true,
        errorObject: new Error(e)
      }
    }
    

  }

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
  client: ipfsClient,
  create: ipfsCreate,
  read: ipfsRead,
  update: ipfsUpdate,
  delete: ipfsDelete,
  list: ipfsList
}

export default IPFS;
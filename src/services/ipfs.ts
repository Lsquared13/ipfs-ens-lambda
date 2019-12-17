import ipfshttpclient from 'ipfs-http-client';
import { operationNotImplemented } from '../common';
import stream from 'stream';
import getStream from 'get-stream';
import unzipper, { Entry } from 'unzipper';
import util from 'util';

const ipfsClient = new ipfshttpclient('ipfs.infura.io', 5001, { protocol: 'https' });

interface File {
  path: string
  content: Buffer
}
interface ipfsCreateResponse {
  hash?: string
  path?: string
  size?: number
  error?: boolean
  errorObject?: Error
}
/**
 * Given a Buffer, write it to Inufra & return the `hash`
 * @param zipStream 
 */
function ipfsCreate(zipStream: stream.Readable): Promise<ipfsCreateResponse> {
  return new Promise(async (resolve, reject) => {
    const files:File[] = [];
    // @ts-ignore Still not typed
    const ipfsStream = ipfsClient.addReadableStream()
    try {
      zipStream
        .pipe(unzipper.Parse())
        .on('entry', async (entry:Entry) => {
          if (entry.path !== '' && entry.type === 'File') {
            const content = await entry.buffer();
            files.push({
              content, path: `/tmp/${entry.path}`
            })
          } else {
            entry.autodrain()
          }
        })
      await util.promisify(stream.finished)(zipStream);
      files.forEach(file => ipfsStream.write(file));
      ipfsStream.end();
      const uploadedFilesArray:ipfsCreateResponse[] = await getStream.array(ipfsStream);
      console.log('---------- IPFS UPLOAD DETAILS ----------');
      console.log(`Buffered following paths into memory : `,files.map(file => file.path))
      console.log(`Uploaded the following path & hash pairs : `,uploadedFilesArray.map((res) => `${res.path}: ${res.hash}`));
      resolve(uploadedFilesArray[uploadedFilesArray.length - 1]);
    } catch (e) {
      reject({
        error: true,
        errorObject: new Error(e)
      });
    }
  })
}

interface ipfsReadResponse {
  cat?: string
  exists?: boolean
  error?: boolean
  errorObject?: Error

}
/**
 * TODO: Check if there is IPFS file at `hash`
 * @param hash  base58 encoded string representing IPFS hash like: 'QmXEmhrMpbVvTh61FNAxP9nU7ygVtyvZA8HZDUaqQCAb66"
 */
async function ipfsRead(hash: string): Promise<ipfsReadResponse> {
  try {
    const results = await ipfsClient.cat(`/ipfs/${hash}`, { offset: 0, length: 2 })
    const cat = results.toString();
    const exists = cat ? true : false;
    return {
      cat: cat,
      exists: exists
    }

  } catch (e) {
    if (e == "Request timed out") {
      return {
        exists: false,
        error: true,
        errorObject: new Error(e)
      }
    } else {
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
async function ipfsUpdate(hash: string) {
  return operationNotImplemented();
}

/**
 * TODO: Can't delete once it's on network, fail gracefully
 * @param hash 
 */
async function ipfsDelete(hash: string) {
  return operationNotImplemented();
}

/**
 * List IPFS info about file if it exists
 * @param hash 
 */
async function ipfsList(hash: string) {
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
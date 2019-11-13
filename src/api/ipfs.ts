import IPFS from "ipfs-http-client";

async function apiCreate( zipLocation: string):Promise<string> {
    const ipfs =  IPFS('ipfs.infura.io', 5001, { protocol: 'https' });
    const content = Buffer.from('ABC')
    const results = await ipfs.add(content)
    const hash = results[0].hash // "Qm...WW"
    return hash;

}

//TODO: Checks if there is a file behind the given hash on IPFS 
async function apiRead( hash: string):Promise<{}> {
    let operationNotImplemented = new Promise((resolve, reject)=>{
        resolve(false);
      });
    return operationNotImplemented;
}

//TODO: Checks if there is a file behind the given hash on IPFS uploads if nothing errors if file already exists, use to retry upload from a different node
async function apiUpdate( hash: string):Promise<{}> {
    let operationNotImplemented = new Promise((resolve, reject)=>{
        resolve(false);
      });
    return operationNotImplemented;
}


//TODO: Cannot delete once it has already been uploaded to network, fail gracefully 
async function apiDelete( hash: string):Promise<{}> {
    let operationNotImplemented = new Promise((resolve, reject)=>{
        resolve(false);
      });
    return operationNotImplemented;
}

//TODO: List IPFS information about the file if it exists
async function apiList( hash: string):Promise<{}> {
    let operationNotImplemented = new Promise((resolve, reject)=>{
        resolve(false);
      });
    return operationNotImplemented;
}



export default {
    create:apiCreate,
    read:apiRead,
    update:apiUpdate,
    delete:apiDelete,
    list:apiList
}
import ipfs from "../services/ipfs"
import utils from "./utils/common"
import fs from 'fs';
import path from 'path';
import { Readable } from "stream";
const uuidv4 = require('uuid/v4');

let dummyContent:Buffer;
let dummyHash:string;

const zipPath = path.resolve(__dirname, '../../sampleBuild.zip');

beforeAll(async () => {
  console.log(`\n Running test...`);
  dummyContent = Buffer.from(utils.mockStringInput())
  const calcHash = await ipfs.client.add(dummyContent,{onlyHash:true})
  dummyHash =calcHash[0].hash
  console.log(`\n Preparing sample data buffers for tests...`);
  console.log(`\t Dummy content: ${dummyContent}`);
  console.log(`\t Dummy hash: ${dummyHash}`);
})

// beforeEach(async () => {

//   await utils.sleep(500);

// })

describe('IPFS upload service', function(){

  test('Upload text buffer to IPFS', async () => {
    try {
      const dummyStream = new Readable();
      dummyStream.push(dummyContent);
      dummyStream.push(null);
      const testStream = fs.createReadStream(zipPath);
      const {hash, path, size, error, errorObject } = await ipfs.create(uuidv4(), testStream)
      console.log("\t IPFS content hash: "+hash);
      expect(hash).toBeTruthy()
      expect(path).toBeTruthy()
      expect(size).toBeTruthy()
      expect(error).toBeUndefined()
      expect(errorObject).toBeUndefined()
    } catch (err) {
      console.log(err);
    }
  }, 90000)

  // test('Check if text buffer is available', async () => {
    
  //   const {cat, exists, error,errorObject}  = await ipfs.read(dummyHash)
  //   console.log("\t echo first 2 characters at IPFS content hash: "+cat);
  //   expect(exists).toBe(true)
  // })

  // test('fetch no file', async () => {
  //   try {
  //     const {cat, exists, error,errorObject} = await ipfs.read("QmJJJJJJJJJJJ8PVp3mZbZK5g2vGDT4LByLJ7m8ciyRFZP")
  //     console.log("\t IPFS content: "+cat);
  //     console.log(error)
  //     console.log(errorObject)
  //     expect(exists).toBe(false)
  //   } catch (err) {
  //     console.log(err);
  //   }
  // })


});



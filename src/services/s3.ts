// @ts-ignore Alas, there are no published bindings for node-zip.
import zip from 'node-zip';
import { S3ArtifactLocation, Credentials } from '@eximchain/api-types/spec/events';
import { AWS } from '../env';
import { addAwsPromiseRetries } from "../common";
import { CodePipeline } from 'aws-sdk';
import { Readable, Stream, Duplex } from 'stream';

const s3 = new AWS.S3({apiVersion: '2006-03-01'});

export const S3 = {
  downloadArtifact,
  getObject: promiseGetS3Object,
  createBucket: promiseCreateS3Bucket,
  checkSize: promiseGetSize
}

export default S3;

function promiseGetS3Object(bucketName:string, objectKey:string) {
  let maxRetries = 5;
  const params = {
      Bucket : bucketName,
      Key : objectKey
  }
  return addAwsPromiseRetries(() => s3.getObject(params).promise(), maxRetries);
}

function promiseGetS3ObjectWithCredentials(bucketName:string, objectKey:string, credentials:Credentials) {
  let maxRetries = 5;
  const params = {
      Bucket : bucketName,
      Key : objectKey
  }

  let credentialClient = new AWS.S3({apiVersion: '2006-03-01', credentials: credentials});

  return addAwsPromiseRetries(() => credentialClient.getObject(params).promise(), maxRetries);
}

async function downloadArtifact(artifactLocation:S3ArtifactLocation, artifactCredentials:Credentials) {
  let getObjectResult = await promiseGetS3ObjectWithCredentials(artifactLocation.bucketName, artifactLocation.objectKey, artifactCredentials);
  console.log("Successfully retrieved artifact: ", getObjectResult);
  let artifact = getObjectResult.Body;
  if (!artifact) throw new Error('Artifact had an undefined body.');
  if (artifact instanceof Readable) {
    console.log('Artifact is already a Readable stream')
    return artifact;
  }

  const artifactStream = new Duplex();
  if (Buffer.isBuffer(artifact)) console.log("Artifact comes back as a Buffer");
  if (typeof artifact === 'string') console.log("Artifact comes back as a string");
  if (artifact instanceof Uint8Array) console.log("Artifact is a Uint8 array");
  if (
    (Buffer.isBuffer(artifact)) ||
    (artifact instanceof Uint8Array) ||
    (typeof artifact === 'string')
  ) {
    artifactStream.push(artifact);
    artifactStream.push(null);
    return artifactStream;
  } else {
    throw new Error('Received a blob, rather than a string, buffer, readable stream, or Uint8Array. Cannot parse blobs, erroring out.');
  }
  // if (Buffer.isBuffer(artifact)) return artifact;
  // if (artifact instanceof Uint8Array) return Buffer.from(artifact);
  // if (typeof artifact === 'string') return Buffer.from(artifact);
  // if (artifact instanceof Readable) {
  //   // Read full stream into buffer
  //   const artifactChunks = [];
  //   for await (let chunk of artifact) {
  //     artifactChunks.push(chunk);
  //   }
  //   return Buffer.concat(artifactChunks);
  // }
  // let test = artifact;
  // const reader = new File
  // return new Buffer(artifact, 'binary')

  // return Buffer.from(getObjectResult.Body as string);

  // let zipArtifact = zip(getObjectResult.Body, {base64: false, checkCRC32: true});
  // console.log("Loaded Zip Artifact");

  // return zipArtifact;
}

function promiseCreateS3Bucket(bucketName:string) {
  let maxRetries = 5;
  let params = {
      Bucket: bucketName,
      ACL: 'private'
  };
  return addAwsPromiseRetries(() => s3.createBucket(params).promise(), maxRetries);
}

async function promiseGetSize(location:CodePipeline.S3Location):Promise<number> {
  let maxRetries = 5;
  let params = {
    Bucket: location.bucket as string,
    Key: location.key as string
  }
  const res = await addAwsPromiseRetries(() => s3.headObject(params).promise(), maxRetries);
  return res.ContentLength || -1;
}
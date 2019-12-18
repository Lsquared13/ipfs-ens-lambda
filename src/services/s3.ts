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
  let artifact = getObjectResult.Body;
  if (!artifact) throw new Error('Artifact had an undefined body.');
  if (artifact instanceof Readable) {
    console.log('Artifact is already a Readable stream')
    return artifact;
  }

  const artifactStream = new Duplex();
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
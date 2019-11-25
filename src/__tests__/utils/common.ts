import fs from 'fs';
import path from 'path';
import casual from 'casual';

export const TEST_CONFIG_FILENAME = './test-config.json';

export function sleep(ms:number) {
  return new Promise((res) => setTimeout(res, ms));
}

export function mockInputString(){
    return casual.words(3).split(' ').join('-')
  }
  
export function prettyPrint(anything:any) { return JSON.stringify(anything, null, 2) }


/**
 * Test config shape JSON file must have exactly there keyes
 */
interface TestConfig {
//   username: string
//   password: string
//   apiUrl?: string
}

/**
 * Util to make sure parsed file if of the correct shape
 */
function isTestConfig(val:any):val is TestConfig {
  return ( true
    // typeof val === 'object' &&
    // typeof val.username === 'string' &&
    // typeof val.password === 'string'
  )
}

/**
 * Load test config
 * `CWD/{$TEST_CONFIG_FILENAME}` should be a JSON file with all the keys specified above
 */
export function testConfig():TestConfig{
  const configFilePath = path.resolve(process.cwd(), TEST_CONFIG_FILENAME);
  if (fs.existsSync(configFilePath)) {
    const testConfig = JSON.parse(fs.readFileSync(configFilePath).toString());
    if (!isTestConfig(testConfig)) {
      throw new Error(`Your test-config.json file exists, but is missing fields.`)
    } else return testConfig;
  } else {
    throw new Error(`Please create a file with a valid fields at ${configFilePath}`);
  }
}

const common= {
    sleep:sleep,
    mockStringInput:mockInputString,
    prettyPrint:prettyPrint,
    testConfig: testConfig
}

export default common;

// const authDataPath = path.resolve(process.cwd(), './dappbotAuthData.json');

// export function getAuthFileData() {
//   if (fs.existsSync(authDataPath)) {
//     return JSON.parse(fs.readFileSync(authDataPath).toString())
//   } else {
//     const authData = User.newAuthData();
//     setAuthFileData(authData);
//     return authData;
//   }
// }

// export function setAuthFileData(newData:User.AuthData) {
//   fs.writeFileSync(authDataPath, JSON.stringify(newData, null, 2));
// }

// /**
//  * Below is a set of custom assertions based on our underlying
//  * data types.  Their response shape is dictated by jest's
//  * expect function, you can find docs about .extend() here:
//  * 
//  * https://jestjs.io/docs/en/expect#expectextendmatchers
//  * 
//  */
// expect.extend({
//   toBeSuccessResponse(received) {
//     const pass = Responses.isSuccessResponse(received);
//     const message = () => pass ?
//       `Did not expect a successResponse, but got one.` :
//       `Expected a successResponse, but it was not, instead including: ${prettyPrint(received.err)} on its err field`;
//     return { pass, message }
//   },
//   toBeErrResponse(received) {
//     const pass = Responses.isErrResponse(received);
//     const message = () => pass ?
//       `Did not expect an errResponse, but we got this one: ${prettyPrint(received)}` :
//       `Expected an errResponse, but instead we got ${prettyPrint(received)}`
//     return { pass, message }
//   }
// })

// /**
//  * Types for above
//  */
// declare global {
//   namespace jest {
//     interface Matchers<R, T> {
//       toBeSuccessResponse(): R;
//       toBeErrResponse(): R;
//     }
//   }
// }

/**
 * Casual is a dummy data generator with a bunch of built-in
 * generators, as well as the ability to define your own.
 */

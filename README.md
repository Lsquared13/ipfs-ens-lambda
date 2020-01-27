# ipfs-ens-lambda

Source for multiple Lambdas: create CodePipeline, deploy build to IPFS, register hash w/ ENS.  Related repos:

- [eximchain-notes/ipfs-ens](https://github.com/Eximchain/eximchain-notes/tree/master/ipfs-ens) - Overall documentation about the system; in particular, architecture diagrams which can be useful references when reading through these Lambdas.
- [terraform-ipfs-ens](https://github.com/Eximchain/terraform-ipfs-ens) - Infrastructure & Deployment
- [ipfs-ens-cli](https://github.com/eximchain/ipfs-ens-cli) - Main interface to interact with system
- [ipfs-ens-spa](https://github.com/eximchain/ipfs-ens-spa) - Simple GUI to login the user and get a GitHub OAuth token
- [ipfs-ens-types](https://github.com/eximchain/ipfs-ens-types) - Types which are shared across the system
- [ipfs-ens-api-client](https://github.com/eximchain/ipfs-ens-api-client) - Node.js client to interact with the IPFS-ENS API, which is supported by these Lambdas

## Project Structure

There are a few top-level directories:
- **`handlers`**: Each Lambda function has its own file whose default export is the "handler function".  The top-level `src/index.ts` file is only responsible for adding exports which point back at those functions.  The event each function receives, and the response shape it requires, depends on what piece of infrastructure the handler is mounted on.
- **`services`**: Business logic is encapsulated within each of these services -- for instance, ENS, IPFS, and S3 all have their own service files.  These services export functions for performing all operations, that way the handler functions can focus on parsing and responding to the event.
- **`__tests__`**: All test files.
- **`types`**: Types for libraries which do not have their own and are not on DefinitelyTyped.  Right now only includes types for `ipfs-http-client`.

## Handler Details

1. **tokenFetch.ts**: Lets our users get tokens for our GitHub OAuth app, mounted on API Gateway.  GET returns the OAuth URL, POST with the redirect code will yield a valid OAuth token.  Must return API response shape.
2. **tokenCheck.ts**: Validates that an Authorization header is a valid GitHub OAuth token.  Mounted as an API Gateway authorizer on the `/deploys` and `/deploys/{name}` methods.  Must call the provided callback with an IAM policy allowing the user to access those methods.
3. **deployStart.ts**: Handles all calls to the `/deploys` & `/deploys/{name}` endpoints, supports creating (POST `/deploys/{name}`), reading (GET `/deploys/{name}`), and listing (GET `/deploys`) deployments.  Requires an API response shape, as it's mounted on the API Gateway.
4. **pipelineTransitionHandler.ts**: Listens for Cloudwatch Events emitted by CodePipelines as they transition between stages, adds appropriate transition keys to the DynamoDB record.  This is connected through a Cloudwatch Event Rule.  It does not need to respond to these events, and can therefore return void.
5. **deployIpfs.ts**: Deploys static sites to IPFS using the Infura API.  Used as the third stage of the created CodePipeline, downloads the built site from the S3 artifact bucket.
6. **deployEns.ts**: Sends Ethereum transactions to register the new subdomain with the ENS Contract.  Consumes messages from an SQS queue one at a time (Lambda only allowed 1 concurrent instance), guaranteeing that we don't run into async issues with nonce management.  Progresses forward by sending a new message to the queue.  Must provide a successful response of some sort so the message is considered consumed.
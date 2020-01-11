# ipfs-ens-lambda
Source for multiple Lambdas: create CodePipeline, deploy build to IPFS, register hash w/ ENS.  Related repos:
- [IPFS-ENS Terraform](https://github.com/Eximchain/terraform-ipfs-ens) - Infrastructure & Deployment
- [IPFS-ENS CLI](https://github.com/eximchain/ipfs-ens-cli) - Main interface to interact with system
- [IPFS-ENS SPA](https://github.com/eximchain/ipfs-ens-spa) - Simple GUI to login the user and get a GitHub OAuth token

## Project Structure
There are three top-level directories:
- **`handlers`**: Each Lambda function has its own file whose default export is the "handler function".  The top-level `src/index.ts` file is only responsible for adding exports which point back at those functions.
- **`services`**: 
- **`__tests__`**: All test files.
- **`types`**: Types for libraries which do not have their own and are not on DefinitelyTyped.  Right now only includes types for `ipfs-http-client`.

## System Design
- Infra: Lay out a diagram showing how all of the infrastructure is laid out and how the Lambdas each participate in the flow.
- Auth: Explain that we're fully delegating authentication by having users just provide GitHub tokens attached to our OAuth app

## Handler Details


### tokenFetchHandler


### tokenCheckHandler


### deployStartHandler


### pipelineTransitionHandler


### deployIpfsHandler


### deployEnsHandler


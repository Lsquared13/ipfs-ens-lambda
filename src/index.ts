'use strict';
import { 
    DeployEns, DeployIpfs, DeployStart, 
    TokenCheck, TokenFetch, PipelineTransition
} from './handlers';

exports.tokenFetchHandler = TokenFetch;

exports.tokenCheckHandler = TokenCheck;

exports.deployStartHandler = DeployStart

exports.deployIpfsHandler = DeployIpfs;

exports.deployEnsHandler = DeployEns;

exports.pipelineTransition = PipelineTransition;
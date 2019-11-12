'use strict';
import { 
    DeployEns, DeployIpfs, DeployStart, 
    TokenCheck, TokenFetch
} from './handlers';

exports.tokenFetchHandler = TokenFetch;

exports.tokenCheckHandler = TokenCheck;

exports.deployStartHandler = DeployStart

exports.deployIpfsHandler = DeployIpfs;

exports.deployEnsHandler = DeployEns;
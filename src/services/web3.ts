import Web3 from 'web3';
import { Chain } from '@eximchain/dappbot-types/spec/dapp';

export const USING_MAINNET = false;

const { Ethereum, Ropsten } = Chain;
export const web3Url = USING_MAINNET ? Ethereum().web3Url : Ropsten().web3Url;
export const web3Provider = new Web3.providers.HttpProvider(web3Url);
export const web3 = new Web3(web3Provider);

export default web3;
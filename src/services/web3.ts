import Web3 from 'web3';
import Chains from '@eximchain/api-types/spec/chains';
import {ethKey, ethAddress} from '../env'

export const USING_MAINNET = false;

const { Ethereum, Ropsten } = Chains;
export const web3Url = USING_MAINNET ? Ethereum().web3Url : Ropsten().web3Url;
export const web3Provider = new Web3.providers.HttpProvider(web3Url);
export const web3 = new Web3(web3Provider);


//TODO: get key from env variable and add to terraform, this needs to be the same as the key that owns  root domain
const privateKey = 'e0f34403.................................29c8c861937';
const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;
web3.eth.defaultAccount === ethAddress;

export default web3;
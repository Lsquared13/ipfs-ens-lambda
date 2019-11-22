import Web3 from 'web3';
import { Chain } from '@eximchain/dappbot-types/spec/dapp';
import {ethKey, ethAddress} from '../env'

export const USING_MAINNET = true;

const { Ethereum, Ropsten } = Chain;
export const web3Url = USING_MAINNET ? Ethereum().web3Url : Ropsten().web3Url;
export const web3Provider = new Web3.providers.HttpProvider(web3Url);
export const web3 = new Web3(web3Provider);


//TODO: get key from env variable and add to terraform, this needs to be the same as the key that owns  root domain
const privateKey = '39b69092cf1135bfa8176b87c8cb21cbaedf9e9b0946aaabf2fa4c3fb17bd9fe';
const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;
web3.eth.defaultAccount === ethAddress;

export default web3;
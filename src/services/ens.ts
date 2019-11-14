import web3 from 'web3';
export const ENS = {};

// Address and ABI taken from the ENS documentation, which links
// to the values on Etherscan:
//
// - ENS docs: https://buildmedia.readthedocs.org/media/pdf/ens/latest/ens.pdf
// - Mainnet: https://etherscan.io/address/0x314159265dd8dbb310642f98f50c066173c1259b
// - Ropsten: https://ropsten.etherscan.io/address/0x112234455c3a32fd11230c42e7bccd4a84e02010
const ropstenAddr = '0x112234455c3a32fd11230c42e7bccd4a84e02010';
const mainnetAddr = '0x314159265dD8dbb310642f98f50C066173C1259b';
const ensABI = require('./ensAbi.json');

export default ENS;
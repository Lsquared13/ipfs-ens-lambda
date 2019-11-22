
import ens from "../src/services/ens"
import utils from "./utils/common"

const unownedSubDomain = "available.hacker.eth"
const availableSubDomain = "available.bitdiddle.eth"
const unavailableSubDomain = "un-available.bitdiddle.eth"
const rootDomain = "bitdiddle"
const hash="QWERTDEADBEEF"


beforeAll(async () => {
  console.log(`\n Running test...`);
})

beforeEach(async () => {
  console.log(`\n Current block number: ` + await ens.getBlockNumber());
  await utils.sleep(500);

})

describe('IPFS upload service', function(){


  test('Web3 gets mainnet blocknumber', async () => {
    const data = await ens.getBlockNumber();
    expect(data).toBeTruthy()
  });

  test('Mainnet resolver contract at resolver.eth points to correct address', async () => {

    const data = await ens.isNameAvailable("resolver");
    expect(data).toBe("0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8")
  });

  test('ENS subdomain is available check succeeds', async () => {
    
    // const data = await ens.isNameAvailable(availableSubDomain)
    // expect(data).toBeFalsy()
  });

  test('ENS subdomain is not available check fails', async () => {
  
    // const data = await ens.isNameAvailable(unavailableSubDomain)
    // expect(data).toBeFalsy()
  });

  test('Create subdomain using root domain Owner succeeds', async () => {
    
    // const data = await ens.makeSubDomain(availableSubDomain)
    // expect(data).toBeTruthy()
  });

  test('Create subdomain using non-owner address fails', async () => {
    // const data = await ens.makeSubDomain(unownedSubDomain)
    // expect(data).toBeTruthy()
  });

  test('Create subdomain that already exists fails', async () => {
    // const data = await ens.makeSubDomain(unavailableSubDomain)
    // expect(data).toBeTruthy()
  });


  test('attach new subdomain resolver succeeds', async () => {
    //  const data = await ens.attachSubDomainResolver(availableSubDomain))
    // expect(data).toBeTruthy()
  });

  test('attach subdomain resolver fails if one already exists', async () => {
    // const data = await ens.attachSubDomainResolver(availableSubDomain)
    // expect(data).toBeTruthy()
  });

  test('attach new IPFS hash to resolver succeeds', async () => {
    //  const data = await ens.addIpfsToResolver(availableSubDomain, hash)
    // expect(data).toBeTruthy()
  });

  test('attach IPFS hash to resolver succeeds if one already exists', async () => {
    // const data = await ens.attachSubDomainResolver(unavailableSubDomain)
    // expect(data).toBeTruthy()
  });

  test('malformed transaction fails', async () => {
    
  });

  test('invalid user input fails', async () => {
   
  });
})


  // test('Can set resolver for root domain', async () => {
  //   const data = await attachSubDomainResolver("bitdiddle.eth")
  //   expect(data).toBe("0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8")
  // });

  
  // test('the fetch fails with an error', async () => {
  //   expect.assertions(1);
  //   try {
  //     await fetchData();
  //   } catch (e) {
  //     expect(e).toMatch('error');
  //   }
  // });
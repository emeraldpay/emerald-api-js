import { Blockchain, address } from '@emeraldpay/api';
import { EmeraldApi } from '../EmeraldApi';

jest.setTimeout(15000);

describe('AddressClient', () => {
  let api: EmeraldApi;

  beforeAll(() => {
    api = EmeraldApi.devApi();
  });

  test('describe contract address', async () => {
    const client = api.address();

    const description = await client.describe({
      address: '0x7EA2be2df7BA6E54B1A9C70676f668455E329d29',
      blockchain: Blockchain.ETHEREUM,
    });

    expect(description.control).toEqual(address.AddressControl.CONTRACT);
  });

  test('describe person address', async () => {
    const client = api.address();

    const description = await client.describe({
      address: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
      blockchain: Blockchain.ETHEREUM,
    });

    expect(description.control).toEqual(address.AddressControl.PERSON);
  });

  test('DescribeXpub', (done) => {
    const client = api.address();

    client
      .describeXpub({
        address:
          'vpub5bGr72An7v5pmqBZecLVnd74Kpip5t9GSPX7ULe9LazdvWq1ECkJ' +
          'Tpsf6YGFcD4T1McCvcaVdmuHZoo1qaNsddqREiheeFfzUuJ1vMjLFWE',
        blockchain: Blockchain.TESTNET_BITCOIN,
      })
      .then(({ address }) => {
        expect(address).toEqual(
          'vpub5bGr72An7v5pmqBZecLVnd74Kpip5t9GSPX7ULe9LazdvWq1ECkJ' +
          'Tpsf6YGFcD4T1McCvcaVdmuHZoo1qaNsddqREiheeFfzUuJ1vMjLFWE',
        );

        done();
      })
      .catch((error) => done(error));
  });
});

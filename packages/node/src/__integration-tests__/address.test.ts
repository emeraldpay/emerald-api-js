import { Blockchain, DescribeAddressControl } from '@emeraldpay/api';
import { EmeraldApi } from '../EmeraldApi';

jest.setTimeout(5000);

describe('AddressClient', () => {
  let api: EmeraldApi;

  beforeAll(() => {
    api = EmeraldApi.devApi();
  });

  test('describe contract address', async () => {
    const client = api.address();

    const description = await client.describeAddress({
      address: '0x7EA2be2df7BA6E54B1A9C70676f668455E329d29',
      chain: Blockchain.ETHEREUM,
    });

    expect(description.control).toEqual(DescribeAddressControl.CONTRACT);
  });

  test('describe person address', async () => {
    const client = api.address();

    const description = await client.describeAddress({
      address: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
      chain: Blockchain.ETHEREUM,
    });

    expect(description.control).toEqual(DescribeAddressControl.PERSON);
  });
});

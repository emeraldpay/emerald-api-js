import { Blockchain } from '@emeraldpay/api';
import { EmeraldApi } from '../EmeraldApi';

jest.setTimeout(30000);

describe('Auth', () => {
  test('auth and get balance', async () => {
    const client = EmeraldApi.productionApi().blockchain();

    const balance = await client.getBalance({
      asset: { blockchain: Blockchain.ETHEREUM, code: 'ETHER' },
      address: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
    });

    expect(balance).toBeDefined();
  });

  test('terminate connection after timeout', async () => {
    const client = EmeraldApi.localApi().blockchain();

    try {
      const balance = await client.getBalance({
        asset: { blockchain: Blockchain.ETHEREUM, code: 'ETHER' },
        address: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
      });

      expect(balance).toBeUndefined();
    } catch (exception) {
      expect(exception).toBeDefined();
    }
  });
});

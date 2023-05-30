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

  test('auth token received once and shared between all clients', async () => {
    const api = EmeraldApi.devApi();

    const blockchainClient = api.blockchain();
    const marketClient = api.market();
    const monitoringClient = api.monitoring();
    const transactionClient = api.transaction();

    const results = await Promise.all([
      blockchainClient.estimateFees({
        blockchain: Blockchain.TESTNET_GOERLI,
        blocks: 1,
        mode: 'avgLast',
      }),
      marketClient.getRates([{ base: 'ETH', target: 'USD' }]),
      monitoringClient.ping(),
      transactionClient.getXpubState({
        address:
          'vpub5bGr72An7v5pmqBZecLVnd74Kpip5t9GSPX7ULe9LazdvWq1ECkJ' +
          'Tpsf6YGFcD4T1McCvcaVdmuHZoo1qaNsddqREiheeFfzUuJ1vMjLFWE',
        blockchain: Blockchain.TESTNET_BITCOIN,
      }),
    ]);

    expect(results.length).toEqual(4);

    const blockchainMetadata = blockchainClient.credentials._getCallCredentials();
    const marketMetadata = marketClient.credentials._getCallCredentials();
    const monitoringMetadata = monitoringClient.credentials._getCallCredentials();
    const transactionMetadata = transactionClient.credentials._getCallCredentials();

    expect(blockchainMetadata._equals(marketMetadata)).toBeTruthy();
    expect(marketMetadata._equals(monitoringMetadata)).toBeTruthy();
    expect(monitoringMetadata._equals(transactionMetadata)).toBeTruthy();
  });
});

import { Blockchain } from '@emeraldpay/api';
import { EmeraldApi } from '../EmeraldApi';

jest.setTimeout(15000);

describe('TransactionClient', () => {
  let api: EmeraldApi;

  beforeAll(() => {
    api = EmeraldApi.devApi();
  });

  test('GetTransactions', (done) => {
    const client = api.transaction();

    client
      .getTransactions({
        address: '0x01066F7d28a2e86cAcd9f9579657077Efe8E371b',
        blockchain: Blockchain.TESTNET_SEPOLIA,
        limit: 1,
      })
      .onData(({ address, blockchain, failed }) => {
        expect(address).toEqual('0x01066f7d28a2e86cacd9f9579657077efe8e371b');
        expect(blockchain).toEqual(Blockchain.TESTNET_SEPOLIA);
        expect(failed).toEqual(false);

        done();
      })
      .onError((error) => done(error));
  });

  test('SubscribeTransactions', (done) => {
    const client = api.transaction();

    const call = client
      .subscribeTransactions({
        address: '0x01066F7d28a2e86cAcd9f9579657077Efe8E371b',
        blockchain: Blockchain.TESTNET_SEPOLIA,
      })
      .onError((error) => done(error));

    call.cancel()
    // don't wait for data, just check that it doesn't throw an error
    done();
  });

});

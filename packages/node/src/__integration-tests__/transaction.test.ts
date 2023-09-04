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
        address: '0x7af963cf6d228e564e2a0aa0ddbf06210b38615d',
        blockchain: Blockchain.TESTNET_GOERLI,
        limit: 1,
      })
      .onData(({ address, blockchain, failed }) => {
        expect(address).toEqual('0x7af963cf6d228e564e2a0aa0ddbf06210b38615d');
        expect(blockchain).toEqual(Blockchain.TESTNET_GOERLI);
        expect(failed).toEqual(false);

        done();
      })
      .onError((error) => done(error));
  });

  test('SubscribeTransactions', (done) => {
    const client = api.transaction();

    const call = client
      .subscribeTransactions({
        address: '0x7af963cf6d228e564e2a0aa0ddbf06210b38615d',
        blockchain: Blockchain.TESTNET_GOERLI,
      })
      .onError((error) => done(error));

    call.cancel()
    // don't wait for data, just check that it doesn't throw an error
    done();
  });

});

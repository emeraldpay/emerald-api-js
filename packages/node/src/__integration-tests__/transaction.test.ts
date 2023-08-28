import { Blockchain } from '@emeraldpay/api';
import { EmeraldApi } from '../EmeraldApi';

jest.setTimeout(15000);

describe('TransactionClient', () => {
  let api: EmeraldApi;

  beforeAll(() => {
    api = EmeraldApi.devApi();
  });

  test.skip('GetBalance', (done) => {
    const client = api.transaction();

    client
      .getBalance({
        address: '0x7af963cf6d228e564e2a0aa0ddbf06210b38615d',
        asset: {
          blockchain: Blockchain.TESTNET_GOERLI,
          code: 'ETH',
        },
      })
      .then(() => done())
      .catch((error) => done(error));
  });

  test('GetXpubState', (done) => {
    const client = api.transaction();

    client
      .getXpubState({
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

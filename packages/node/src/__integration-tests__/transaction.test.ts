import { Blockchain } from '@emeraldpay/api';
import { EmeraldApi } from '../EmeraldApi';

jest.setTimeout(10000);

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

  test('GetAddressTx', (done) => {
    const client = api.transaction();

    client
      .getAddressTx({
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

  test('GetAddressTokens', (done) => {
    const client = api.transaction();
    const call = client.getAddressTokens({
      blockchain: Blockchain.TESTNET_GOERLI,
      address: '0x7af963cf6d228e564e2a0aa0ddbf06210b38615d',
      contractAddresses: [],
    });
    call.onData((value) => {
      expect(value.address).toBe('0x7af963cf6d228e564e2a0aa0ddbf06210b38615d');
      expect(value.blockchain).toBe(Blockchain.TESTNET_GOERLI);
      console.log('GetAddressTokens', value);
      done();
    });
    call.onError((err) => {
      console.warn('err', err);
      done.fail(err);
    });
  });

  test('SubscribeAddressTokens', (done) => {
    const client = api.transaction();
    const call = client.subscribeAddressTokens({
      blockchain: Blockchain.TESTNET_GOERLI,
      address: '0x7af963cf6d228e564e2a0aa0ddbf06210b38615d',
      contractAddresses: ['0x3f152b63ec5ca5831061b2dccfb29a874c317502'],
    });
    call.onData((value) => {
      expect(value.address).toBe('0x7af963cf6d228e564e2a0aa0ddbf06210b38615d');
      expect(value.blockchain).toBe(Blockchain.TESTNET_GOERLI);
      expect(value.contractAddresses[0]).toBe('0x3f152b63ec5ca5831061b2dccfb29a874c317502');
      console.log('SubscribeAddressTokens', value);
      call.cancel();
      done();
    });
    call.onError((err) => {
      console.warn('err', err);
      call.cancel();
      done.fail(err);
    });
  });

  test('GetAddressAllowance', (done) => {
    const client = api.transaction();
    const call = client.getAddressAllowance({
      blockchain: Blockchain.TESTNET_GOERLI,
      address: '0x0000000000000000000000000000000000000000',
      contractAddresses: ['0x509ee0d083ddf8ac028f2a56731412edd63223b9'],
    });
    call.then((value) => {
      expect(value[0].blockchain).toBe(Blockchain.TESTNET_GOERLI);
      expect(value[0].address).toBe('0x0000000000000000000000000000000000000000');
      expect(value[0].approvedForAddress[0]).toBe('0x509ee0d083ddf8ac028f2a56731412edd63223b9');
      console.log('GetAddressAllowance', value);
      done();
    });
    call.catch((err) => {
      console.warn('err', err);
      done.fail(err);
    });
  });
});

import { Blockchain } from '@emeraldpay/api';
import { EmeraldApi } from '../EmeraldApi';

jest.setTimeout(15000);

describe('TokenClient', () => {
  let api: EmeraldApi;

  beforeAll(() => {
    api = EmeraldApi.devApi();
  });

  test('GetTokens', async () => {
    const client = api.token();
    const value = await client.getTokens({
      blockchain: Blockchain.TESTNET_GOERLI,
      address: '0x7af963cf6d228e564e2a0aa0ddbf06210b38615d',
      contractAddresses: [],
    });
    expect(value.address).toBe('0x7af963cf6d228e564e2a0aa0ddbf06210b38615d');
    expect(value.blockchain).toBe(Blockchain.TESTNET_GOERLI);
    console.log('GetAddressTokens', value);
  });

  test('SubscribeTokens', (done) => {
    const client = api.token();
    const call = client.subscribeTokens({
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
      done(err);
    });
  });

  test('GetAllowanceTokens', async () => {
    const client = api.token();
    const value = await client.getAllowanceTokens({
      blockchain: Blockchain.TESTNET_GOERLI,
      address: '0x0000000000000000000000000000000000000000',
      contractAddresses: ['0x509ee0d083ddf8ac028f2a56731412edd63223b9'],
    });
    expect(value.blockchain).toBe(Blockchain.TESTNET_GOERLI);
    expect(value.address).toBe('0x0000000000000000000000000000000000000000');
    expect(value.approvedForAddress[0]).toBe('0x509ee0d083ddf8ac028f2a56731412edd63223b9');
    console.log('GetAddressAllowance', value);
  });

  test('GetAllowanceAmounts', (done) => {
    const client = api.token();
    const call = client.getAllowanceAmounts({
      blockchain: Blockchain.TESTNET_GOERLI,
      address: '0x0000000000000000000000000000000000000000',
      contractAddresses: ['0x509ee0d083ddf8ac028f2a56731412edd63223b9'],
    });
    call.onData((value) => {
      console.log('GetAddressAllowance', value);

      expect(value.blockchain).toBe(Blockchain.TESTNET_GOERLI);
      expect(value.address).toBe('0x0000000000000000000000000000000000000000');
      expect(value.contractAddress).toBe('0x509ee0d083ddf8ac028f2a56731412edd63223b9');
      // spender address is not checked, as it could be changed in the future
      // expect(value.ownerAddress).toBe('0x23160eb5db66cf0f876df64751e02dbee16fb340');
      expect(value.spenderAddress).toBe('0x0000000000000000000000000000000000000000');
      call.cancel();
      done();
    });
    call.onError((err) => {
      console.warn('err', err);
      call.cancel();
      done(err);
    });
  });
});

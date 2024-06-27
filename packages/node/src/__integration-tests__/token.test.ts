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
      blockchain: Blockchain.TESTNET_SEPOLIA,
      address: '0x7af963cf6d228e564e2a0aa0ddbf06210b38615d',
      contractAddresses: [],
    });
    console.log('GetTokens', value);

    expect(value.address).toBe('0x7af963cf6d228e564e2a0aa0ddbf06210b38615d');
    expect(value.blockchain).toBe(Blockchain.TESTNET_SEPOLIA);
  });

  test('SubscribeTokens', (done) => {
    const client = api.token();
    const call = client.subscribeTokens({
      blockchain: Blockchain.TESTNET_SEPOLIA,
      address: '0x9744c11004a16cfee68a45a69dde7913e098f4f5',
      contractAddresses: ['0x089652957c24f0c904b390e4bb2b57121f591472'],
    });
    call.onData((value) => {
      expect(value.address).toBe('0x9744c11004a16cfee68a45a69dde7913e098f4f5');
      expect(value.blockchain).toBe(Blockchain.TESTNET_SEPOLIA);
      expect(value.contractAddresses[0]).toBe('0x089652957c24f0c904b390e4bb2b57121f591472');
      console.log('SubscribeTokens', value);
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
      blockchain: Blockchain.TESTNET_SEPOLIA,
      address: '0x0000000000000000000000000000000000000000',
      contractAddresses: ['0x2863192e43fd72f0405719041504e19fd6e70d24'],
    });
    console.log('GetAllowanceTokens', value);
    expect(value.blockchain).toBe(Blockchain.TESTNET_SEPOLIA);
    expect(value.address).toBe('0x0000000000000000000000000000000000000000');
    expect(value.approvedForAddress[0]).toBe('0x2863192e43fd72f0405719041504e19fd6e70d24');
  });

  test('GetAllowanceAmounts', (done) => {
    const client = api.token();
    const call = client.getAllowanceAmounts({
      blockchain: Blockchain.TESTNET_SEPOLIA,
      address: '0x0000000000000000000000000000000000000000',
      contractAddresses: ['0x2863192e43fd72f0405719041504e19fd6e70d24'],
    });
    call.onData((value) => {
      console.log('GetAllowanceAmounts', value);

      expect(value.blockchain).toBe(Blockchain.TESTNET_SEPOLIA);
      expect(value.address).toBe('0x0000000000000000000000000000000000000000');
      expect(value.contractAddress).toBe('0x2863192e43fd72f0405719041504e19fd6e70d24');
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

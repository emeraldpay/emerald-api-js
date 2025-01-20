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
      address: '0xcdfdc3752caaa826fe62531e0000c40546ec56a6',
      contractAddresses: ['0x543ddb01ba47acb11de34891cd86b675f04840db'],
    });
    console.log('GetAllowanceTokens', value);
    expect(value.blockchain).toBe(Blockchain.TESTNET_SEPOLIA);
    expect(value.address).toBe('0xcdfdc3752caaa826fe62531e0000c40546ec56a6');
    expect(value.approvedForAddress[0]).toBe('0x543ddb01ba47acb11de34891cd86b675f04840db');
  });

  test('GetAllowanceAmounts', (done) => {
    const client = api.token();
    const call = client.getAllowanceAmounts({
      blockchain: Blockchain.TESTNET_SEPOLIA,
      address: '0xcdfdc3752caaa826fe62531e0000c40546ec56a6',
      contractAddresses: ['0x543ddb01ba47acb11de34891cd86b675f04840db'],
    });
    call.onData((value) => {
      console.log('GetAllowanceAmounts', value);

      expect(value.blockchain).toBe(Blockchain.TESTNET_SEPOLIA);
      expect(value.address).toBe('0xcdfdc3752caaa826fe62531e0000c40546ec56a6');
      expect(value.contractAddress).toBe('0x543ddb01ba47acb11de34891cd86b675f04840db');
      expect(value.spenderAddress).toBe('0xcdfdc3752caaa826fe62531e0000c40546ec56a6');
      // owner address is not checked, as it could be changed in the future
      // expect(value.ownerAddress).toBe('0x0fc05e8ea021b56cdd9111a0c35b31598c1a0dfd');
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

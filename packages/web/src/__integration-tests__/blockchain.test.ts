import { Blockchain, NativeCallResponse } from '@emeraldpay/api';
import { EmeraldApi } from '../EmeraldApi';

jest.setTimeout(30000);

describe('BlockchainClient', () => {
  let api: EmeraldApi;

  beforeAll(() => {
    // Origin is set in jest.config.js
    api = EmeraldApi.devApi()
  });

  test('Get head', (done) => {
    const client = api.blockchain;

    const call = client.subscribeHead(Blockchain.ETHEREUM);

    call
      .onData(() => {
        call.cancel();

        done();
      })
      .onError((error) => {
        call.cancel();

        done(error);
      });
  });

  test('Get block', (done) => {
    const client = api.blockchain;

    client
      .nativeCall(Blockchain.ETHEREUM, [
        {
          id: 1,
          method: 'eth_getBlockByNumber',
          payload: ['0x1', false],
        },
      ])
      .onData((value) => {
        expect(value.success).toBeTruthy();

        const act = value as NativeCallResponse;

        expect(act.payload).toBeDefined();
        expect(act.payload.hash).toBe('0x88e96d4537bea4d9c05d12549907b32561d3bf31f45aae734cdc119f13406cb6');

        done();
      })
      .onError((error) => done(error));
  });
});

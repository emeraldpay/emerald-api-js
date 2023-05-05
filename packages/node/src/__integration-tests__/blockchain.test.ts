import {
  Blockchain,
  NativeCallResponse,
  isBitcoinStdFees,
  isEthereumExtFees,
  isEthereumStdFees,
} from '@emeraldpay/api';
import * as grpc from '@grpc/grpc-js';
import { EmeraldApi } from '../EmeraldApi';

jest.setTimeout(30000);

describe('BlockchainClient', () => {
  let api: EmeraldApi;

  beforeAll(() => {
    api = EmeraldApi.devApi();
  });

  test('Get head', (done) => {
    const client = api.blockchain();

    const call = client.subscribeHead(Blockchain.ETHEREUM);

    call
      .onData(({ height }) => {
        expect(height).toBeGreaterThan(0);

        call.cancel();

        done();
      })
      .onError((error) => {
        call.cancel();

        done.fail(error);
      });
  });

  test('Get block', (done) => {
    const client = api.blockchain();

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

        const { payload } = value as NativeCallResponse;

        expect(payload).toBeDefined();

        done();
      })
      .onError((error) => done.fail(error));
  });

  test('Make few requests', (done) => {
    const client = api.blockchain();

    let counter = 0;

    client
      .nativeCall(Blockchain.ETHEREUM, [
        {
          id: 1,
          method: 'eth_getBlockByNumber',
          payload: ['0x1', false],
        },
        {
          id: 1,
          method: 'eth_gasPrice',
          payload: [],
        },
      ])
      .onData((value) => {
        expect(value.success).toBeTruthy();

        const { payload } = value as NativeCallResponse;

        expect(payload).toBeDefined();

        counter += 1;

        if (counter === 2) {
          done();
        }
      })
      .onError((error) => done.fail(error));
  });

  test('Get ethereum balance', (done) => {
    const client = api.blockchain();

    client
      .getBalance({
        address: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
        asset: { blockchain: Blockchain.ETHEREUM, code: 'ETHER' },
      })
      .then((value) => {
        expect(value.length).toBe(1);
        expect(value[0].address).toBe('0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be');

        done();
      })
      .catch((error) => done.fail(error));
  });

  test('Get erc-20 token balance', (done) => {
    const client = api.blockchain();

    client
      .getBalance({
        address: '0xae2d4617c862309a3d75a0ffb358c7a5009c673f',
        asset: { blockchain: Blockchain.ETHEREUM, code: 'USDC' },
      })
      .then((value) => {
        expect(value.length).toBe(1);
        expect(value[0].address).toBe('0xae2d4617c862309a3d75a0ffb358c7a5009c673f');

        done();
      })
      .catch((error) => done.fail(error));
  });

  // TODO Fix bitcoin on server
  xtest('Get bitcoin balance for address', (done) => {
    const client = api.blockchain();

    client
      .getBalance({
        address: 'bc1qmh07ff738tnennr6xz5lkcy3478v2v6k0aacwc',
        asset: { blockchain: Blockchain.BITCOIN, code: 'BTC' },
      })
      .then((value) => {
        expect(value.length).toBe(1);
        expect(value[0].address).toBe('bc1qmh07ff738tnennr6xz5lkcy3478v2v6k0aacwc');

        done();
      })
      .catch((error) => done.fail(error));
  });

  // TODO Fix bitcoin on server
  xtest('Get bitcoin balance for xpub', (done) => {
    const client = api.blockchain();

    client
      .getBalance({
        address:
          'vpub5ab1RDcpFBvgxMWxKfvVLLHtC6JfF784F6zBdKhoWJhcrS8Mu8Lb' +
          'hMWRWoXHDAgWtWfAAuF6DWLJqy7kLNn69wvyXQwdYJ4ehsTFhW65Qkp',
        asset: { blockchain: Blockchain.TESTNET_BITCOIN, code: 'BTC' },
        includeUtxo: true,
      })
      .then((value) => {
        expect(value.length).toBeGreaterThan(0);

        done();
      })
      .catch((error) => done.fail(error));
  });

  // TODO Fix bitcoin on server
  xtest('Subscribe bitcoin balance for xpub', (done) => {
    const client = api.blockchain();

    const call = client.subscribeBalance({
      address:
        'vpub5arxPHpfH2FKSNnBqyZJctzBtruGzM4sat7YKcQQNoNGgVZehD1t' +
        'LiYGvhXBhPzKPcRDRjhGw94Dc9Wwob9BpbAMmkMX7Dzdfd5Ly9LHTGQ',
      asset: { blockchain: Blockchain.TESTNET_BITCOIN, code: 'BTC' },
      includeUtxo: true,
    });

    call
      .onData(() => {
        call.cancel();

        done();
      })
      .onError((error) => {
        call.cancel();

        done.fail(error);
      });
  });

  test('subscribe ethereum tx', (done) => {
    const client = api.blockchain();

    client
      .subscribeTxStatus({
        txid: '0xf3cfd7cd8f9384744ec91062de6f5a84daba2ea33d978933f297f44e751edc8c',
        limit: 10,
        blockchain: 100,
      })
      .onData((response) => {
        expect(response.block.hash).toBe('5038ffc0d84d496fb6669ab0e60df559fa39dbf181f278d508086a82fc72761f');
        expect(response.block.height).toBe(2500001);
        expect(response.mined).toBeTruthy();

        done();
      })
      .onError((error) => done.fail(error));
  });

  test('subscribe bitcoin tx', (done) => {
    const client = api.blockchain();

    client
      .subscribeTxStatus({
        blockchain: 1,
        limit: 3,
        txid: '9a7870a8bd7805bdb270db77105eb4a811058cfec602107ba1d027b6bf028928',
      })
      .onData((response) => {
        expect(response.block.height).toBe(651732);
        expect(response.mined).toBeTruthy();

        done();
      })
      .onError((error) => done.fail(error));
  });

  test('get ethereum fees', async () => {
    const client = api.blockchain();

    const response = await client.estimateFees({
      blockchain: 100,
      blocks: 10,
      mode: 'avgLast',
    });

    expect(isEthereumExtFees(response)).toBeTruthy();

    if (isEthereumExtFees(response)) {
      expect(response.expect.length).toBeGreaterThan(5);
      expect(parseInt(response.expect.substr(0, 5))).toBeGreaterThan(0);
    }
  });

  test('get ethereum classic fees', async () => {
    const client = api.blockchain();

    const response = await client.estimateFees({
      blockchain: 101,
      blocks: 50,
      mode: 'avgLast',
    });

    expect(isEthereumStdFees(response)).toBeTruthy();

    if (isEthereumStdFees(response)) {
      expect(response.fee.length).toBeGreaterThan(3);
      expect(parseInt(response.fee.substr(0, 3))).toBeGreaterThan(0);
    }
  });

  test('get bitcoin fees', async () => {
    const client = api.blockchain();

    const response = await client.estimateFees({
      blockchain: 1,
      blocks: 6,
      mode: 'avgLast',
    });

    expect(isBitcoinStdFees(response)).toBeTruthy();

    if (isBitcoinStdFees(response)) {
      expect(response.satPerKb).toBeGreaterThan(100);
    }
  });

  test('native call with unacceptable raw transaction', async (done) => {
    const client = api.blockchain();

    client
      .nativeCall(Blockchain.BITCOIN, [
        {
          id: 0,
          method: 'sendrawtransaction',
          payload: [
            '02000000017f910020aee597427c89943d20dbb6291f4b0056ffa182e0891bdd0d76e7527700000000' +
              '00fdffffff01e803000000000000160014f81b17222c8bf510ea8568220d0b21bc548a4ad800000000',
          ],
        },
      ])
      .onData((value) => {
        expect(value.success).toBeFalsy();

        done();
      })
      .onError((error) => done.fail(error));
  });

  test('native call terminated after connection failed', async (done) => {
    const server = new grpc.Server();

    server.bindAsync('localhost:0', grpc.ServerCredentials.createInsecure(), (error) => {
      expect(error).toBeNull();

      let timeout: NodeJS.Timeout | null = null;

      const client = EmeraldApi.fakeApi().blockchain();

      const call = client
        .nativeCall(Blockchain.BITCOIN, [
          {
            id: 0,
            method: 'sendrawtransaction',
            payload: [
              '02000000017f910020aee597427c89943d20dbb6291f4b0056ffa182e0891bdd0d76e7527700000000' +
                '00fdffffff01e803000000000000160014f81b17222c8bf510ea8568220d0b21bc548a4ad800000000',
            ],
          },
        ])
        .onError(() => {
          if (timeout != null) {
            clearTimeout(timeout);
          }

          server.tryShutdown(done);
        });

      timeout = setTimeout(() => {
        call.cancel();

        server.tryShutdown(() => done.fail('Connection closed incorrectly'));
      }, 20 * 1000);
    });
  });
});

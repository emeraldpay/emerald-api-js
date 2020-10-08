import {EmeraldApi} from "../EmeraldApi";
import {Blockchain} from "@emeraldpay/api";
import {NativeCallResponse} from "@emeraldpay/api";

jest.setTimeout(5000);

describe("BlockchainClient", () => {
    let api: EmeraldApi;

    beforeAll(() => {
        api = EmeraldApi.devApi();
    });

    test('Get head', (done) => {
        const client = api.blockchain();

        const call = client.subscribeHead(Blockchain.ETHEREUM);
        call
            .onData((value) => {
                console.log('Head', value);
                call.cancel();
                done();
            })
            .onError((err) => {
                console.warn("err", err);
                call.cancel();
                done.fail(err)
            });
    });

    test('Get block', (done) => {
        const client = api.blockchain();

        client.nativeCall(Blockchain.ETHEREUM, [
            {
                id: 1,
                method: "eth_getBlockByNumber",
                payload: ["0x1", false]
            }
        ]).onData((value) => {
            expect(value.success).toBeTruthy();
            let act = value as NativeCallResponse;
            expect(act.payload).toBeDefined();
            console.log('Block', act.payload);
            done()
        })
            .onError((err) => {
                console.warn("err", err);
                done.fail(err)
            })
    });

    test('Make few requests', (done) => {
        const client = api.blockchain();
        let exp = 0;

        client.nativeCall(Blockchain.ETHEREUM, [
            {
                id: 1,
                method: "eth_getBlockByNumber",
                payload: ["0x1", false]
            },
            {
                id: 1,
                method: "eth_gasPrice",
                payload: []
            }
        ]).onData((value) => {
            expect(value.success).toBeTruthy();
            let act = value as NativeCallResponse;
            expect(act.payload).toBeDefined();
            console.log('Resp #' + exp, act.payload);
            exp++;
            if (exp == 2) {
                done()
            }
        })
            .onError((err) => {
                console.warn("requsts err", err);
                done.fail(err)
            })
    });

    test("Get ethereum balance", (done) => {
        const client = api.blockchain();

        client.getBalance(
            {
                asset: {blockchain: Blockchain.ETHEREUM, code: "ETHER"},
                address: "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE"
            }
        ).then((value) => {
            console.log("Balance", value);
            expect(value.length).toBe(1);
            expect(value[0].address).toBe("0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be");
            done()
        }).catch((err) => {
            console.warn("balance failed", err);
            done.fail(err)
        })
    });

    test("Get bitcoin balance for address", (done) => {
        const client = api.blockchain();

        client.getBalance(
            {
                asset: {blockchain: Blockchain.BITCOIN, code: "BTC"},
                address: "bc1qmh07ff738tnennr6xz5lkcy3478v2v6k0aacwc"
            }
        ).then((value) => {
            console.log("Balance", value);
            expect(value.length).toBe(1);
            expect(value[0].address).toBe("bc1qmh07ff738tnennr6xz5lkcy3478v2v6k0aacwc");
            done()
        }).catch((err) => {
            console.warn("balance failed", err);
            done.fail(err)
        })
    });

    test("Get bitcoin balance for xpub", (done) => {
        const client = api.blockchain();

        client.getBalance(
            {
                asset: {blockchain: Blockchain.TESTNET_BITCOIN, code: "BTC"},
                address: "vpub5ab1RDcpFBvgxMWxKfvVLLHtC6JfF784F6zBdKhoWJhcrS8Mu8LbhMWRWoXHDAgWtWfAAuF6DWLJqy7kLNn69wvyXQwdYJ4ehsTFhW65Qkp",
                includeUtxo: true
            }
        ).then((value) => {
            console.log("Balance", value);
            expect(value.length > 0).toBeTruthy();
            done()
        }).catch((err) => {
            console.warn("balance failed", err);
            done.fail(err)
        })
    });

    test("Subscribe bitcoin balance for xpub", (done) => {
        const client = api.blockchain();

        const call = client.subscribeBalance(
            {
                asset: {blockchain: Blockchain.TESTNET_BITCOIN, code: "BTC"},
                address: "vpub5arxPHpfH2FKSNnBqyZJctzBtruGzM4sat7YKcQQNoNGgVZehD1tLiYGvhXBhPzKPcRDRjhGw94Dc9Wwob9BpbAMmkMX7Dzdfd5Ly9LHTGQ",
                includeUtxo: true
            }
        );
        call.onData((value) => {
            console.log("Balance", value);
            call.cancel();
            done()
        }).onError((err) => {
            console.warn("balance failed", err);
            call.cancel();
            done.fail(err)
        })
    });

    test("subscribe ethereum tx", (done) => {
        const client = api.blockchain();
        const req = client.subscribeTxStatus({
            txid: "0xf3cfd7cd8f9384744ec91062de6f5a84daba2ea33d978933f297f44e751edc8c",
            limit: 10,
            blockchain: 100
        });

        req.onData((resp) => {
            expect(resp.mined).toBeTruthy();
            expect(resp.block.height).toBe(2500001);
            expect(resp.block.hash).toBe("5038ffc0d84d496fb6669ab0e60df559fa39dbf181f278d508086a82fc72761f");
            done()
        });
        req.onError((err) => {
            done.fail(err)
        })
    });

    test("subscribe bitcoin tx", (done) => {
        const client = api.blockchain();
        const req = client.subscribeTxStatus({
            txid: "9a7870a8bd7805bdb270db77105eb4a811058cfec602107ba1d027b6bf028928",
            limit: 3,
            blockchain: 1
        });

        req.onData((resp) => {
            expect(resp.mined).toBeTruthy();
            expect(resp.block.height).toBe(651732);
            done();
        });
        req.onError((err) => {
            done.fail(err)
        })
    });
});

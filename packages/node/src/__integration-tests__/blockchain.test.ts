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

        client.subscribeHead(Blockchain.ETHEREUM)
            .onData((value) => {
                console.log('Head', value);
                done()
            })
            .onError((err) => {
                console.warn("err", err);
                done.fail(err)
            })
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

    test("Get balance", (done) => {
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
});


import {EmeraldApi} from "../EmeraldApi";
import {Blockchain} from "@emeraldpay/api-client-core";
import {NativeCallResponse} from "@emeraldpay/api-client-core/lib/typesBlockchain";

jest.setTimeout(5000);

describe("BlockchainClient", () => {
    test('Get head', (done) => {
        const api = new EmeraldApi();
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
        const api = new EmeraldApi();
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
            expect(act.payload.result).toBeDefined();
            console.log('Block', act.payload.result);
            done()
        })
            .onError((err) => {
                console.warn("err", err);
                done.fail(err)
            })
    });

    test('Get few blocks', (done) => {
        const api = new EmeraldApi();
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
                method: "eth_getBlockByHash",
                //block on height 2
                payload: ["0xb495a1d7e6663152ae92708da4843337b958146015a2802f4193a410044698c9", false]
            }
        ]).onData((value) => {
            expect(value.success).toBeTruthy();
            let act = value as NativeCallResponse;
            expect(act.payload.result).toBeDefined();
            console.log('Block' + exp, act.payload.result);
            exp++;
            if (exp == 2) {
                done()
            }
        })
            .onError((err) => {
                console.warn("err", err);
                done.fail(err)
            })
    });

    test("Get balance", (done) => {
        const api = new EmeraldApi();
        const client = api.blockchain();

        const resp = client.getBalance(
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
            console.warn(err);
            done.fail(err)
        })
    });
});


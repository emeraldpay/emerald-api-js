import {EmeraldApi} from "../EmeraldApi";
import {Blockchain} from "@emeraldpay/api";
import {NativeCallResponse} from "@emeraldpay/api";

jest.setTimeout(30000);

describe("BlockchainClient", () => {
    let api: EmeraldApi;

    beforeAll(() => {
        // ORIGIN is set in jest.config.js
        api = new EmeraldApi("https://api.emeraldpay.dev");
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

});

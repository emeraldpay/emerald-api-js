import {Chain, ChainRef} from "..";
import {EmeraldApi} from "../EmeraldApi";

jest.setTimeout(5000);

describe("BlockchainClient", () => {
    test('Get head', (done) => {
        const api = new EmeraldApi();
        const client = api.blockchain();

        const req = new Chain();
        req.setType(ChainRef.CHAIN_ETHEREUM);

        client.subscribeHead(req)
            .onData((value) => {
                console.log('value', value);
                done()
            })
            .onError((err) => {
                console.warn("err", err);
                done.fail(err)
            })
    });
});


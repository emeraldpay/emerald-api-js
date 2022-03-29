import {EmeraldApi} from "../EmeraldApi";
import {Blockchain} from "@emeraldpay/api";

jest.setTimeout(30000);

describe("Auth", () => {
    let api: EmeraldApi;

    beforeAll(() => {
        api = EmeraldApi.defaultApi();
    });

    test('auth and get balance', async () => {
        const client = api.blockchain();

        const call = await client.getBalance(
            {
                asset: {blockchain: Blockchain.ETHEREUM, code: "ETHER"},
                address: "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE"
            }
        );
        expect(call).toBeDefined();
    });


});

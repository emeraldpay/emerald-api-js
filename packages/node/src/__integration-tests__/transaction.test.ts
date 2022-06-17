import {EmeraldApi} from "../EmeraldApi";
import {Blockchain} from "@emeraldpay/api";

jest.setTimeout(10000);

describe("TransactionClient", () => {
    let api: EmeraldApi;

    beforeAll(() => {
        api = EmeraldApi.devApi();
    });

    test('GetBalance', (done) => {
        const client = api.transaction();
        const call = client.getBalance(
            {
                asset: {
                    blockchain: Blockchain.TESTNET_GOERLI,
                    code: "ETH",
                },
                address: "0x7af963cf6d228e564e2a0aa0ddbf06210b38615d",
            }
        );
        call.then((value) => {
            // expect(value).toBe("0x7af963cf6d228e564e2a0aa0ddbf06210b38615d");
            // expect(value.blockchain).toBe(Blockchain.TESTNET_GOERLI);
            console.log('GetBalance', value);
            done()
        })
        call.catch((err) => {
            console.warn("balance failed", err);
            done.fail(err)
        })
    });

    test('GetAddressTx', (done) => {
        const client = api.transaction();
        const call = client.getAddressTx(
            {
                blockchain: Blockchain.TESTNET_GOERLI,
                address: "0x7af963cf6d228e564e2a0aa0ddbf06210b38615d",
                limit: 1,
            }
        );
        call.onData((value) => {
            expect(value.address).toBe("0x7af963cf6d228e564e2a0aa0ddbf06210b38615d");
            // expect(value.blockchain).toBe(Blockchain.TESTNET_GOERLI);
            console.log('GetAddressTx', value);
            done()
        })
        call.onError((err) => {
            console.warn("err", err);
            done.fail(err)
        })
    });

});

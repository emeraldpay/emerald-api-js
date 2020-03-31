import {Chain, ChainRef} from "..";
import {EmeraldApi} from "../EmeraldApi";

jest.setTimeout(5000);

describe("MonitoringClient", () => {
    let api: EmeraldApi;

    beforeAll(() => {
        api = EmeraldApi.devApi();
    });

    test('Ping', () => {
        const client = api.monitoring();

        const req = new Chain();
        req.setType(ChainRef.CHAIN_ETHEREUM);

        let act = client.ping();
        expect(act).resolves.toBe(true);
    });
});


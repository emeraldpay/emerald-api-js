import {Chain, ChainRef} from "..";
import {EmeraldApi} from "../EmeraldApi";

jest.setTimeout(5000);

describe("MonitoringClient", () => {
    test('Ping', () => {
        const api = new EmeraldApi();
        const client = api.monitoring();

        const req = new Chain();
        req.setType(ChainRef.CHAIN_ETHEREUM);

        let act = client.ping();
        expect(act).resolves.toBe(true);
    });
});


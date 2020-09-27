import {EmeraldApi} from "../EmeraldApi";

jest.setTimeout(5000);

describe("MonitoringClient", () => {
    let api: EmeraldApi;

    beforeAll(() => {
        api = EmeraldApi.devApi();
    });

    test('Ping', () => {
        const client = api.monitoring();
        let act = client.ping();
        expect(act).resolves.toBe(true);
    });
});


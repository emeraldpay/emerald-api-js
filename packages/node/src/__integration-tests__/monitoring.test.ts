import {EmeraldApi} from "../EmeraldApi";

jest.setTimeout(5000);

describe("MonitoringClient", () => {
    let api: EmeraldApi;

    beforeAll(() => {
        api = EmeraldApi.devApi();
    });

    //TODO fix on server
    xtest('Ping', async () => {
        const client = api.monitoring();
        let act = await client.ping();
        expect(act).toBe(true);
    });
});


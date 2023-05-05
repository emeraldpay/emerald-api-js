import { EmeraldApi } from '../EmeraldApi';

jest.setTimeout(5000);

describe('MonitoringClient', () => {
  let api: EmeraldApi;

  beforeAll(() => {
    api = EmeraldApi.devApi();
  });

  test('Ping', async () => {
    const client = api.monitoring();

    const act = await client.ping();

    expect(act).toBe(true);
  });
});

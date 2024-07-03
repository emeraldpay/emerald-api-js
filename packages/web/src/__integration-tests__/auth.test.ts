import { EmeraldApi } from '../EmeraldApi';

describe('Auth', () => {

  test('is authenticated', async () => {
    const client = EmeraldApi.devApi().auth;

    const resp = await client.whoIAm()

    expect(resp.authenticated).toBeTruthy();
  });

});

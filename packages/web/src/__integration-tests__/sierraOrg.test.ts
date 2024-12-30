import {EmeraldApi} from "../EmeraldApi";

jest.setTimeout(35000);

describe("SierraOrgClient", () => {
  let api: EmeraldApi;

  beforeAll(() => {
    api = EmeraldApi.devApi();
  });

  test('getOrg',  async () => {
    const client = api.sierraOrg;

    const actual  = await client.getOrg({
      orgId: "cafe0000-0000-4000-a000-000000000000",
    })
    expect(actual).toEqual({
      orgId: "cafe0000-0000-4000-a000-000000000000",
      name: "Test Org",
      description: "Organization for using in tests",
      createdAt: new Date("2024-11-21T22:32:41.173Z"),
    });
  });

});
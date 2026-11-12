import {publishListToPromise, sierra} from "@emeraldpay/api";
import {EmeraldApi} from "../EmeraldApi";

jest.setTimeout(35000);

describe("SierraBillingClient", () => {
  const orgId = "cafe0000-0000-4000-a000-000000000000";
  // the dev token is not an admin of the org, so the project doesn't have to exist
  const projectId = "cafe0000-0000-4000-a000-000000000001";

  let api: EmeraldApi;

  beforeAll(() => {
    api = EmeraldApi.devApi();
  });

  test('getCosts permission denied for the user', async () => {
    const call = api.sierraBilling.getCosts({
      orgId,
      projectId,
      timestampFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
      granularity: sierra.Granularity.HOUR,
    });
    await expect(publishListToPromise(call)).rejects.toMatchObject({code: 7}); // 7: PERMISSION_DENIED
  });

  // NOTE: the server validates the arguments before checking the access, so it answers INVALID_ARGUMENT even for
  // the dev token, which is not an admin. If that order changes, it will be PERMISSION_DENIED instead
  test('getCosts rejects a granularity finer than an hour', async () => {
    const call = api.sierraBilling.getCosts({
      orgId,
      projectId,
      timestampFrom: new Date(Date.now() - 60 * 60 * 1000),
      // not allowed by the type, sent anyway to check the server validates it
      granularity: sierra.Granularity.MINUTE as unknown as sierra.CostGranularity,
    });
    await expect(publishListToPromise(call)).rejects.toMatchObject({code: 3}); // 3: INVALID_ARGUMENT
  });

  test('getOrgBilling permission denied for the user', async () => {
    await expect(api.sierraBilling.getOrgBilling({orgId})).rejects.toMatchObject({code: 7}); // 7: PERMISSION_DENIED
  });

  test('getProjectBilling permission denied for the user', async () => {
    await expect(api.sierraBilling.getProjectBilling({orgId, projectId})).rejects.toMatchObject({code: 7}); // 7: PERMISSION_DENIED
  });

  test('getBalance permission denied for the user', async () => {
    await expect(api.sierraBilling.getBalance({orgId, projectId})).rejects.toMatchObject({code: 7}); // 7: PERMISSION_DENIED
  });

  test('getAccountHistory permission denied for the user', async () => {
    const call = api.sierraBilling.getAccountHistory({
      orgId,
      projectId,
      timestampFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });
    await expect(publishListToPromise(call)).rejects.toMatchObject({code: 7}); // 7: PERMISSION_DENIED
  });
});

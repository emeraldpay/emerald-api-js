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
    const call = api.sierraBilling().getCosts({
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
    const call = api.sierraBilling().getCosts({
      orgId,
      projectId,
      timestampFrom: new Date(Date.now() - 60 * 60 * 1000),
      // not allowed by the type, sent anyway to check the server validates it
      granularity: sierra.Granularity.MINUTE as unknown as sierra.CostGranularity,
    });
    await expect(publishListToPromise(call)).rejects.toMatchObject({code: 3}); // 3: INVALID_ARGUMENT
  });

  test('getOrgBilling permission denied for the user', async () => {
    await expect(api.sierraBilling().getOrgBilling({orgId})).rejects.toMatchObject({code: 7}); // 7: PERMISSION_DENIED
  });

  test('getProjectBilling permission denied for the user', async () => {
    await expect(api.sierraBilling().getProjectBilling({orgId, projectId})).rejects.toMatchObject({code: 7}); // 7: PERMISSION_DENIED
  });

  test('getBalance permission denied for the user', async () => {
    await expect(api.sierraBilling().getBalance({orgId, projectId})).rejects.toMatchObject({code: 7}); // 7: PERMISSION_DENIED
  });

  test('getAccountHistory permission denied for the user', async () => {
    const call = api.sierraBilling().getAccountHistory({
      orgId,
      projectId,
      timestampFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });
    await expect(publishListToPromise(call)).rejects.toMatchObject({code: 7}); // 7: PERMISSION_DENIED
  });
});

/**
 * Reads the real costs, which needs a token of an admin of the organization. Skipped unless it's provided as:
 * - `EMERALD_TEST_TOKEN` - the token
 * - `EMERALD_TEST_ORG_ID` - an organization the token is an admin of
 * - `EMERALD_TEST_PROJECT_ID` - a project of that organization
 */
const adminEnv = {
  token: process.env.EMERALD_TEST_TOKEN,
  orgId: process.env.EMERALD_TEST_ORG_ID,
  projectId: process.env.EMERALD_TEST_PROJECT_ID,
};
const describeAsAdmin = adminEnv.token && adminEnv.orgId && adminEnv.projectId ? describe : describe.skip;

describeAsAdmin("SierraBillingClient as an admin", () => {
  const orgId = adminEnv.orgId!;
  const projectId = adminEnv.projectId!;

  let api: EmeraldApi;

  beforeAll(() => {
    api = EmeraldApi.devApi(adminEnv.token);
  });

  function expectValidSeries(series: sierra.CostSeries[]): void {
    expect(series.length).toBeGreaterThan(0);
    series.forEach((item) => {
      expect(item.projectId).toBe(projectId);
      expect(item.currency).toMatch(/^[A-Z]{3}$/);
      item.costs.forEach((cost) => {
        expect(cost.timestamp.getTime()).not.toBeNaN();
        expect(typeof cost.amount).toBe("number");
      });
    });
  }

  test('getCosts per project', async () => {
    const series = await publishListToPromise(api.sierraBilling().getCosts({
      orgId,
      projectId,
      timestampFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      granularity: sierra.Granularity.DAY,
    }));
    console.log("costs", JSON.stringify(series));

    expectValidSeries(series);
    expect(series.length).toBe(1);
    expect(series[0].method).toBeUndefined();
    expect(series[0].measurement).toBeUndefined();
  });

  test('getCosts per component', async () => {
    const series = await publishListToPromise(api.sierraBilling().getCosts({
      orgId,
      projectId,
      timestampFrom: new Date(Date.now() - 24 * 60 * 60 * 1000),
      granularity: sierra.Granularity.HOUR,
      breakdown: sierra.CostBreakdown.COMPONENT,
    }));
    console.log("costs by component", JSON.stringify(series));

    series.forEach((item) => {
      expect(item.projectId).toBe(projectId);
      expect(item.method).toBeDefined();
      expect(item.measurement).toBeDefined();
      item.costs.forEach((cost) => expect(cost.quantity).toBeDefined());
    });
  });

  test('getOrgBilling', async () => {
    const billing = await api.sierraBilling().getOrgBilling({orgId});
    console.log("org billing", JSON.stringify(billing));

    expect(billing.orgId).toBe(orgId);
    if (billing.discount) {
      expect(billing.discount.rate).toBeGreaterThanOrEqual(0);
    }
  });

  test('getProjectBilling', async () => {
    const billing = await api.sierraBilling().getProjectBilling({orgId, projectId});
    console.log("project billing", JSON.stringify(billing));

    expect(billing.orgId).toBe(orgId);
    expect(billing.projectId).toBe(projectId);
    expect(billing.currency).toMatch(/^[A-Z]{3}$/);
  });

  test('getBalance', async () => {
    const balance = await api.sierraBilling().getBalance({orgId, projectId});
    console.log("balance", JSON.stringify(balance));

    expect(balance.projectId).toBe(projectId);
    expect(typeof balance.settled.amount).toBe("number");
    expect(balance.settled.currency).toMatch(/^[A-Z]{3}$/);
    expect(balance.settledThrough.getTime()).not.toBeNaN();
  });

  test('getAccountHistory', async () => {
    const days = await publishListToPromise(api.sierraBilling().getAccountHistory({
      orgId,
      projectId,
      timestampFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    }));
    console.log("account history", JSON.stringify(days));

    // days when nothing happened are included too
    expect(days.length).toBeGreaterThan(0);
    days.forEach((day) => {
      expect(day.timestamp.getTime() % (24 * 60 * 60 * 1000)).toBe(0);
      [day.charged, day.adjusted, day.paid, day.balance].forEach((money) => {
        expect(typeof money.amount).toBe("number");
        expect(money.currency).toMatch(/^[A-Z]{3}$/);
      });
      expect(day.paid.amount).toBeGreaterThanOrEqual(0);
    });
  });
});

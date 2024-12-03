import {EmeraldApi} from "../EmeraldApi";

jest.setTimeout(35000);

describe("SierraStatClient", () => {
  let api: EmeraldApi;

  beforeAll(() => {
    // a dev token with user id: bada55a1-0000-4000-a000-000000000000
    api = EmeraldApi.devApi("emrld_fU88aIafXsCClerhyWtflBp1hH6h112ckzpSfP");
  });

  test('getRequestCount', (done) => {
    const client = api.sierraStat;

    const call = client.getRequestCount({
      orgId: "cafe0000-0000-4000-a000-000000000000",
    })
    call
      .onData((data) => {
        console.log("requestCount", data);
        call.cancel();
        done();
      })
      .onError((error) => {
        call.cancel();
        console.log("cancel: ", error.message);
        done(error);
      })
      .finally(() => {
        console.log("stream ended");
        done();
      });
  });

  test('getTokenStat', (done) => {
    const client = api.sierraStat;

    const call = client.getTokenStat({
      orgId: "cafe0000-0000-4000-a000-000000000000",
    })
    call
      .onData((data) => {
        console.log("tokenStat", data);
        call.cancel();
        done();
      })
      .onError((error) => {
        call.cancel();
        console.log("cancel: ", error.message);
        done(error);
      })
      .finally(() => {
        console.log("stream ended");
        done();
      });
  });
});
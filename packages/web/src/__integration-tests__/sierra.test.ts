import {EmeraldApi} from "../EmeraldApi";

jest.setTimeout(35000);

describe("SierraStatClient", () => {
  let api: EmeraldApi;

  beforeAll(() => {
    // ORIGIN is set in jest.config.js
    api = EmeraldApi.devApi();
  });

  test('getRequestCount', (done) => {
    const client = api.sierraStat;

    const call = client.getRequestCount({
      orgId: "test-org",
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
      orgId: "test-org",
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
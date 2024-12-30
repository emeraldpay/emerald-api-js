import {EmeraldApi} from "../EmeraldApi";

jest.setTimeout(35000);

describe("SierraProjectClient", () => {
  let api: EmeraldApi;

  beforeAll(() => {
    api = EmeraldApi.devApi();
  });

  test('createProject permission denied for the user',  async () => {
    const client = api.sierraProject;

    try {
      await client.createProject({
        orgId: "cafe0000-0000-4000-a000-000000000000",
        name: "Test Project",
        description: "Project for using in tests",
      })
      // return expect(call).rejects.toEqual({code: 7, message: ""}); // 7: PERMISSION_DENIED
    } catch (e) {
      console.log("createProject error: ", e)
      expect(e).toEqual({code: 7, message: ""}); // 7: PERMISSION_DENIED
    }

    // return expect(call).rejects.toEqual({code: 7, message: ""}); // 7: PERMISSION_DENIED
  });

  test('listProjects',  (done) => {
    const client = api.sierraProject;

    const call = client.listProjects({
      orgId: "cafe0000-0000-4000-a000-000000000000",
    })
    call
      .onData((data) => {
        console.log("listProjects", data);
        done();
      })
      .onError((error) => {
        console.log("cancel: ", error.message);
        done(error);
      })
  });

});
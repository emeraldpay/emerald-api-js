import {required} from "../typesConvert";

describe("required", () => {

    test("returns the value", () => {
        expect(required("test", "field")).toBe("test");
    });

    test("returns a falsy value", () => {
        expect(required(0, "field")).toBe(0);
        expect(required("", "field")).toBe("");
        expect(required(false, "field")).toBe(false);
    });

    test("fails on undefined", () => {
        expect(() => required(undefined, "address")).toThrow("Invalid response: no address");
    });

    test("fails on null", () => {
        expect(() => required(null, "address")).toThrow("Invalid response: no address");
    });
});

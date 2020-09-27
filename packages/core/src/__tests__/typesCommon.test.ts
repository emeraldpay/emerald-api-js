import {isXpubAddress} from "../typesCommon";

describe("isXpubAddress", () => {
    test("for zpub", () => {
        expect(
            isXpubAddress("zpub6qncJfL5WNzvqgdNJNvnERKR2b6ytsyzwtpPxYxE5BSVhWD7CLMCkMNEGYAo38NTyAtNiSGgx3SMhpoVJ54QZeegNqEaCrvHhytEjsyY4eF")
        ).toBeTruthy();
    });
    test("for xpub", () => {
        expect(
            isXpubAddress("xpub6CB5Ug1xJoGVjkywgetJ5GakppwzVv7aFdmBLWVHdZk3Gv8XeUNrdBBLah9pTcisiM7BBLvKEYzi67vB2vUzLdLgUEfFN4MiLyS8hJcdLaA")
        ).toBeTruthy();
    });
    test("for ypub", () => {
        expect(
            isXpubAddress("ypub6ZWQo5xXSms7vdVes1xbmYL5UFZ2WFUNHCWtKRSqAEopLF4SMVEcDygGu4BCsJwgsrcjvZALGrAdNkrGnFVmpj63erFmBDyVMJ5gW3qK2Q3")
        ).toBeTruthy();
    });
    test("for vpub", () => {
        expect(
            isXpubAddress("vpub5aw5b5FM1TjLo98dWn7F7wK2Cu8esNqYK6LKqB4ZCnBKmRCVWNsGTAKnjcQNwk1yjPpt6UB2zwLvCVeqxRxLHgttUEMQHMcQb7qmW8pmRUM")
        ).toBeTruthy();
    });

    test("for private", () => {
        expect(
            isXpubAddress("vprv9MwjBZiTB6B3af4AQkaEkoNHesJATv7gwsQj2neweSeLtcsLxqZ1uN1JtMYdG7Kt3HDxN7PoTAnNyQuZze6UZtCSAxutzqExQrZMhKshDus")
        ).toBeFalsy();
        expect(
            isXpubAddress("zprvAcoFu9oBg1SddCYuCMPmsHNgUZGVVRG9aftoAAYcWquWphsxeo2xCZ3kRGdpbVjLFzW8fG5XqLXrwdHZ5HJo5ByiHM2JhzErrArjcGTgk3c")
        ).toBeFalsy();
        expect(
            isXpubAddress("xprv9yBj5AV4URiCXGuUadMHi8e2Go7W6TPitQqaY85g5ED4Q7oP6w4c5NrrjSSfwoJhyc9PAMWjE1JATUd1M3qn7rwRww8vKtTnf4mp455iAa9")
        ).toBeFalsy();
    });

    test("for address", () => {
        expect(
            isXpubAddress("1FYLNrNDrbEX7xPx6u3dns15WTyMMExHgd")
        ).toBeFalsy();
        expect(
            isXpubAddress("bc1qs6l47yam0x2fzpsvla6htv379y6hlsgk53hktf")
        ).toBeFalsy();
        expect(
            isXpubAddress("tb1qhlz9x03nla5zm5xdqft826xx27fu6m3luk82x6")
        ).toBeFalsy();
    });

    test("for empty", () => {
        expect(
            isXpubAddress(undefined)
        ).toBeFalsy();
        expect(
            isXpubAddress(null)
        ).toBeFalsy();
        expect(
            isXpubAddress("")
        ).toBeFalsy();
    });

    test("for detailed xpub", () => {
        expect(
            isXpubAddress({xpub: "xpub6CB5Ug1xJoGVjkywgetJ5GakppwzVv7aFdmBLWVHdZk3Gv8XeUNrdBBLah9pTcisiM7BBLvKEYzi67vB2vUzLdLgUEfFN4MiLyS8hJcdLaA"})
        ).toBeTruthy();
    });
});

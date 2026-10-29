import {CHAINS, chainByCode} from "../chain";
import {ChainRef} from "../generated/common_pb";

const protobufIds = Object.values(ChainRef)
    .filter((it) => it !== ChainRef.CHAIN_UNSPECIFIED);

describe("CHAINS", () => {

    test("has a chain for each Protobuf chain", () => {
        const ids = Object.values(CHAINS).map((it) => it.id);

        protobufIds.forEach((id) => {
            expect(ids).toContain(id);
        });
    });

    test("has unique ids", () => {
        const ids = Object.values(CHAINS).map((it) => it.id);

        expect(new Set(ids).size).toBe(ids.length);
    });

    test("has unique codes", () => {
        const codes = Object.values(CHAINS).map((it) => it.code.toLowerCase());

        expect(new Set(codes).size).toBe(codes.length);
    });

    test("uses Protobuf id for Matic", () => {
        expect(CHAINS.MATIC.id).toBe(ChainRef.CHAIN_MATIC);
        expect(CHAINS.FANTOM.id).toBe(ChainRef.CHAIN_FANTOM);
    });
});

describe("ChainSpec.toProtobuf", () => {

    test("converts each Protobuf chain", () => {
        Object.values(CHAINS)
            .filter((it) => protobufIds.includes(it.id))
            .forEach((chain) => {
                expect(chain.toProtobuf()?.getType()).toBe(chain.id);
            });
    });

    test("converts Matic", () => {
        expect(CHAINS.MATIC.toProtobuf()?.getType()).toBe(ChainRef.CHAIN_MATIC);
    });

    test("no value for not an actual chain", () => {
        expect(CHAINS.UNSPECIFIED.toProtobuf()).toBeNull();
        expect(CHAINS.GRIN.toProtobuf()).toBeNull();
        expect(CHAINS.CUSTOM.toProtobuf()).toBeNull();
    });
});

describe("chainByCode", () => {

    test("finds a chain ignoring the case", () => {
        expect(chainByCode("sepolia")).toBe(CHAINS.SEPOLIA);
        expect(chainByCode("ETH")).toBe(CHAINS.ETHEREUM);
        expect(chainByCode("ftm")).toBe(CHAINS.FANTOM);
    });

    test("unspecified for unknown code", () => {
        expect(chainByCode("nope")).toBe(CHAINS.UNSPECIFIED);
    });
});

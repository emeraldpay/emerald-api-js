import * as common_pb from "../generated/common_pb";
import * as token_message_pb from "../generated/token.message_pb";
import {Blockchain} from "../typesCommon";
import {MessageFactory} from "../typesConvert";
import {Convert} from "../typesToken";

const factory: MessageFactory = (id: string) => {
    switch (id) {
        case 'token_message_pb.AddressAllowanceRequest':
            return new token_message_pb.AddressAllowanceRequest();
        case 'common_pb.AnyAddress':
            return new common_pb.AnyAddress();
        case 'common_pb.SingleAddress':
            return new common_pb.SingleAddress();
        default:
            throw Error(`Unsupported type ${id}`);
    }
};
const converter = new Convert(factory);

const address = "0xcdfdc3752caaa826fe62531e0000c40546ec56a6";
const contract = "0x543ddb01ba47acb11de34891cd86b675f04840db";
const owner = "0x0227b825bddc6a9aa329a25c94e9f9142a623d67";

const singleAddress = (value: string): common_pb.SingleAddress => new common_pb.SingleAddress().setAddress(value);

describe("addressAllowanceRequest", () => {

    test("with cursor and limit", () => {
        const act = converter.addressAllowanceRequest({
            blockchain: Blockchain.ETHEREUM,
            address,
            contractAddresses: [contract],
            cursor: "test-cursor",
            limit: 10,
        });

        expect(act.getCursor()).toBe("test-cursor");
        expect(act.getLimit()).toBe(10);
        expect(act.getContractAddressesList().map((it) => it.getAddress())).toEqual([contract]);
    });

    test("without cursor and limit", () => {
        const act = converter.addressAllowanceRequest({
            blockchain: Blockchain.ETHEREUM,
            address,
            contractAddresses: [contract],
        });

        expect(act.getCursor()).toBe("");
        expect(act.getLimit()).toBe(0);
    });
});

describe("addressAllowanceAmount", () => {

    const full = (): token_message_pb.AddressAllowanceAmount => new token_message_pb.AddressAllowanceAmount()
        .setChain(common_pb.ChainRef.CHAIN_SEPOLIA)
        .setAddress(singleAddress(address))
        .setContractAddress(singleAddress(contract))
        .setOwnerAddress(singleAddress(owner))
        .setSpenderAddress(singleAddress(address))
        .setAllowance("100")
        .setAvailable("50");

    test("converts", () => {
        const act = converter.addressAllowanceAmount()(full());

        expect(act.address).toBe(address);
        expect(act.contractAddress).toBe(contract);
        expect(act.ownerAddress).toBe(owner);
        expect(act.spenderAddress).toBe(address);
        expect(act.allowance).toBe("100");
        expect(act.available).toBe("50");
    });

    test("fails without address", () => {
        expect(() => converter.addressAllowanceAmount()(full().setAddress(undefined)))
            .toThrow("Invalid response: no address");
    });

    test("fails without contract address", () => {
        expect(() => converter.addressAllowanceAmount()(full().setContractAddress(undefined)))
            .toThrow("Invalid response: no contract address");
    });

    test("fails without owner address", () => {
        expect(() => converter.addressAllowanceAmount()(full().setOwnerAddress(undefined)))
            .toThrow("Invalid response: no owner address");
    });

    test("fails without spender address", () => {
        expect(() => converter.addressAllowanceAmount()(full().setSpenderAddress(undefined)))
            .toThrow("Invalid response: no spender address");
    });
});

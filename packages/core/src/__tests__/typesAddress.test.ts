import {UInt32Value} from "google-protobuf/google/protobuf/wrappers_pb";
import * as address_message_pb from "../generated/address.message_pb";
import * as common_pb from "../generated/common_pb";
import {ConvertAddress} from "../typesAddress";
import {MessageFactory} from "../typesConvert";

const factory: MessageFactory = (id: string) => {
    throw Error(`Unsupported type ${id}`);
};
const converter = new ConvertAddress(factory);

const xpub = "xpub6CB5Ug1xJoGVjkywgetJ5GakppwzVv7aFdmBLWVHdZk3Gv8XeUNrdBBLah9pTcisiM7BBLvKEYzi67vB2vUzLdLgUEfFN4MiLyS8hJcdLaA";

describe("describeResponse", () => {

    test("converts", () => {
        const response = new address_message_pb.DescribeResponse()
            .setAddress(new common_pb.SingleAddress().setAddress("0xdac17f958d2ee523a2206206994597c13d831ec7"))
            .setActive(true)
            .setIsContract(true);

        const act = converter.describeResponse()(response);

        expect(act.address).toBe("0xdac17f958d2ee523a2206206994597c13d831ec7");
        expect(act.active).toBeTruthy();
        expect(act.isContract).toBeTruthy();
    });

    test("fails without address", () => {
        const response = new address_message_pb.DescribeResponse()
            .setActive(true);

        expect(() => converter.describeResponse()(response)).toThrow("Invalid response: no address");
    });
});

describe("describeXpubResponse", () => {

    test("converts with last address", () => {
        const response = new address_message_pb.DescribeXpubResponse()
            .setChain(common_pb.ChainRef.CHAIN_BITCOIN)
            .setAddress(new common_pb.XpubAddress().setXpub(xpub))
            .setLastAddress(new common_pb.SingleAddress().setAddress("bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"))
            .setLastIndex(new UInt32Value().setValue(15));

        expect(converter.describeXpubResponse()(response)).toEqual({
            blockchain: common_pb.ChainRef.CHAIN_BITCOIN,
            address: xpub,
            lastAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            lastIndex: 15,
        });
    });

    test("converts without last address", () => {
        const response = new address_message_pb.DescribeXpubResponse()
            .setChain(common_pb.ChainRef.CHAIN_BITCOIN)
            .setAddress(new common_pb.XpubAddress().setXpub(xpub));

        const act = converter.describeXpubResponse()(response);

        expect(act.lastAddress).toBeUndefined();
        expect(act.lastIndex).toBeUndefined();
    });

    test("fails without xpub", () => {
        const response = new address_message_pb.DescribeXpubResponse()
            .setChain(common_pb.ChainRef.CHAIN_BITCOIN);

        expect(() => converter.describeXpubResponse()(response)).toThrow("Invalid response: no address");
    });
});

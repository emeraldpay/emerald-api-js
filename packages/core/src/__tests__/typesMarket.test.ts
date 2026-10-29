import * as common_pb from "../generated/common_pb";
import * as market_pb from "../generated/market_pb";
import {ConvertMarket} from "../typesMarket";

describe("pairResponse", () => {

    const factory = (id: string) => {
        throw Error(`Unsupported type ${id}`)
    }
    const converter = new ConvertMarket(factory)

    test("base currency pair", () => {
        const rate = new market_pb.Rate()
            .setBase("ETH")
            .setTarget("USD");

        expect(converter.pairResponse(rate)).toEqual({base: "ETH", target: "USD"});
    });

    test("erc20 target", () => {
        const erc20 = new common_pb.Erc20Asset()
            .setChain(common_pb.ChainRef.CHAIN_ETHEREUM)
            .setContractAddress("0xdac17f958d2ee523a2206206994597c13d831ec7");
        const rate = new market_pb.Rate()
            .setBase("USD")
            .setErc20Target(erc20);

        expect(converter.pairResponse(rate)).toEqual({
            base: "USD",
            target: {blockchain: common_pb.ChainRef.CHAIN_ETHEREUM, contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7"},
        });
    });

    test("fails without base currency", () => {
        const rate = new market_pb.Rate()
            .setTarget("USD");

        expect(() => converter.pairResponse(rate)).toThrow("No base currency in rate");
    });

    test("fails without target currency", () => {
        const rate = new market_pb.Rate()
            .setBase("ETH");

        expect(() => converter.pairResponse(rate)).toThrow("No target currency in rate");
    });
});

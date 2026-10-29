import * as common_pb from "../generated/common_pb";
import * as market_pb from "../generated/market_pb";
import {MessageFactory} from "../typesConvert";
import {ConvertMarket} from "../typesMarket";

describe("pairResponse", () => {

    const factory: MessageFactory = (id: string) => {
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

describe("ratesRequest", () => {

    const factory: MessageFactory = (id: string) => {
        switch (id) {
            case 'market_pb.GetRatesRequest':
                return new market_pb.GetRatesRequest();
            case 'market_pb.Pair':
                return new market_pb.Pair();
            default:
                throw Error(`Unsupported type ${id}`);
        }
    }
    const converter = new ConvertMarket(factory)

    test("list of pairs", () => {
        const act = converter.ratesRequest([{base: "ETH", target: "USD"}]);

        expect(act.getPairsList().length).toBe(1);
        expect(act.getPairsList()[0].getBase()).toBe("ETH");
        expect(act.getPairsList()[0].getTarget()).toBe("USD");
    });

    test("object with pairs", () => {
        const act = converter.ratesRequest({pairs: [{base: "ETH", target: "USD"}, {base: "BTC", target: "EUR"}]});

        expect(act.getPairsList().length).toBe(2);
        expect(act.getPairsList()[1].getBase()).toBe("BTC");
    });

    test("pairs at timestamp", () => {
        const act = converter.ratesRequest({timestamp: new Date(1700000000000), pairs: [{base: "ETH", target: "USD"}]});

        expect(act.getPairsList().length).toBe(1);
        expect(act.getTimestamp()).toBe(1700000000000);
    });

    test("fails without pairs", () => {
        // possible only when called from JavaScript, or with a type cast
        expect(() => converter.ratesRequest({} as never)).toThrow("No pairs in rates request");
    });
});

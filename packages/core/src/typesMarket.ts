import * as market_pb from "./generated/market_pb";
import {MessageFactory} from "./convert";
import {DataMapper} from "./Publisher";
import {ConvertCommon, Erc20Asset} from "./typesCommon";

export type CryptoCurrency = "BTC" | "GRIN" | "ETC" | "ETH";
export type StablecoinCurrency = "DAI" | "SAI" | "USDT";
export type CountryCurrency =
    "USD"
    | "EUR"
    | "CAD"
    | "GBP"
    | "RUB"
    | "JPY"
    | "CHF"
    | "CNY"
    | "MXN"
    | "BRL"
    | "HKD"
    | "KRW"
    | "SGD"
    | "INR";
export type TestCurrency = "MONOPOLY" | "KOVAN" | "TEST_BTC";

export type AnyCurrency = CryptoCurrency | StablecoinCurrency | CountryCurrency | TestCurrency | Erc20Asset

export type GetRatesRequest = Pair[];

export type Pair = {
    base: AnyCurrency,
    target: AnyCurrency
};

export type GetRatesResponse = Rate[];

export type Rate = {
    base: AnyCurrency;
    target: AnyCurrency;
    /**
     * exchange rate decimal encoded as a string
     */
    rate: string;
}

function isErc20Asset(obj: AnyCurrency): obj is Erc20Asset {
    return typeof obj === "object" && obj.blockchain !== undefined && obj.contractAddress !== undefined;
}

export class ConvertMarket {
    private factory: MessageFactory;
    private common: ConvertCommon;

    constructor(factory: MessageFactory, common: ConvertCommon = new ConvertCommon(factory)) {
        this.factory = factory;
        this.common = common;
    }

    public ratesRequest(pairs: GetRatesRequest): market_pb.GetRatesRequest {
        let req: market_pb.GetRatesRequest = this.factory("market_pb.GetRatesRequest");
        pairs.forEach((pair) => {
            let pairProto: market_pb.Pair = this.factory("market_pb.Pair");
            if (isErc20Asset(pair.base)) {
                pairProto.setErc20Base(this.common.pbErc20Asset(pair.base));
            } else {
                pairProto.setBase(pair.base);
            }
            if (isErc20Asset(pair.target)) {
                pairProto.setErc20Target(this.common.pbErc20Asset(pair.target));
            } else {
                pairProto.setTarget(pair.target);
            }
            req.addPairs(pairProto);
        });
        return req;
    }

    public ratesResponse(): DataMapper<market_pb.GetRatesResponse, GetRatesResponse> {
        return (value) => {
            let rates: Rate[] = value.getRatesList().map((rate) => {
                let base
                if (rate.hasErc20Base()) {
                    base = this.common.erc20Asset(rate.getErc20Base());
                } else if (rate.hasBase()) {
                    base = rate.getBase();
                } else {
                    throw new Error("No base currency in rate");
                }
                let target
                if (rate.hasErc20Target()) {
                    target = this.common.erc20Asset(rate.getErc20Target());
                } else if (rate.hasTarget()) {
                    target = rate.getTarget();
                }
                return {
                    base: base,
                    target: target,
                    rate: rate.getRate()
                } as Rate
            });
            return rates;
        }
    }
}

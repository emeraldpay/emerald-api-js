import * as market_pb from "./generated/market_pb";
import {MessageFactory} from "./convert";
import {DataMapper} from "./Publisher";

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

export type AnyCurrency = CryptoCurrency | StablecoinCurrency | CountryCurrency | TestCurrency;

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

export class ConvertMarket {
    private factory: MessageFactory;

    constructor(factory: MessageFactory) {
        this.factory = factory;
    }

    public ratesRequest(pairs: GetRatesRequest): market_pb.GetRatesRequest {
        let req: market_pb.GetRatesRequest = this.factory("market_pb.GetRatesRequest");
        pairs.forEach((pair) => {
            let pairProto: market_pb.Pair = this.factory("market_pb.Pair");
            pairProto.setBase(pair.base);
            pairProto.setTarget(pair.target);
            req.addPairs(pairProto);
        });
        return req;
    }

    public ratesResponse(): DataMapper<market_pb.GetRatesResponse, GetRatesResponse> {
        return (value) => {
            let rates: Rate[] = value.getRatesList().map((rate) => {
                return {
                    base: rate.getBase(),
                    target: rate.getTarget(),
                    rate: rate.getRate()
                } as Rate
            });
            return rates;
        }
    }
}
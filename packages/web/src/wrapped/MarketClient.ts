import * as market_rpc from '../generated/MarketServiceClientPb';
import {
    ConvertMarket, GetRatesRequest, GetRatesResponse,
    publishToPromise,
    readOnce
} from "@emeraldpay/api";
import {WebChannel, callStream, callSingle, callPromise} from "../channel";
import {classFactory} from "./Factory";

export class MarketClient {
    private readonly client: market_rpc.MarketClient;
    private readonly channel: WebChannel;
    private readonly convert = new ConvertMarket(classFactory);

    constructor(hostname: string, channel: WebChannel) {
        this.client = new market_rpc.MarketClient(hostname);
        this.channel = channel;
    }

    public getRates(request: GetRatesRequest): Promise<GetRatesResponse> {
        const req = this.convert.ratesRequest(request);
        const mapper = this.convert.ratesResponse();

        let call = callPromise(this.client.getRates.bind(this.client), mapper);
        return publishToPromise(readOnce(this.channel, call, req));
    }

}
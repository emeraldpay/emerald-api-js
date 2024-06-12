import { ConvertMarket, GetRatesRequest, GetRatesResponse, publishToPromise, readOnce } from "@emeraldpay/api";
import { callPromise, WebChannel } from "../channel";
import * as market_rpc from '../generated/MarketServiceClientPb';
import { classFactory } from "./Factory";
import {CredentialsContext} from "../credentials";

export class MarketClient {
    readonly client: market_rpc.MarketClient;
    readonly channel: WebChannel;
    readonly retries: number;

    private readonly convert = new ConvertMarket(classFactory);

    constructor(hostname: string, channel: WebChannel, credentials: CredentialsContext, retries = 3) {
        this.client = new market_rpc.MarketClient(hostname, null, credentials.options);
        this.channel = channel;
        this.retries = retries;
    }

    public getRates(request: GetRatesRequest): Promise<GetRatesResponse> {
        const req = this.convert.ratesRequest(request);
        const mapper = this.convert.ratesResponse();

        const call = callPromise(this.client.getRates.bind(this.client), mapper);
        return publishToPromise(readOnce(this.channel, call, req, this.retries));
    }

}

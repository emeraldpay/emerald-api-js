import {
    ConnectionListener,
    ConvertMarket,
    GetRatesRequest,
    GetRatesResponse,
    publishToPromise,
    readOnce,
} from "@emeraldpay/api";
import * as grpc from "@grpc/grpc-js";
import { callSingle, NativeChannel } from "../channel";
import * as prices_grpc_pb from '../generated/market_grpc_pb';
import { classFactory } from "./Factory";

export class MarketClient {
    readonly client: prices_grpc_pb.MarketClient;
    readonly channel: NativeChannel;
    readonly retries: number;

    private readonly convert = new ConvertMarket(classFactory);

    constructor(address: string, credentials: grpc.ChannelCredentials, retries = 3) {
        this.client = new prices_grpc_pb.MarketClient(address, credentials);
        this.channel = new NativeChannel(this.client);
        this.retries = retries;
    }

    public setConnectionListener(listener: ConnectionListener) {
        this.channel.setListener(listener);
    }

    public getRates(request: GetRatesRequest): Promise<GetRatesResponse> {
        const req = this.convert.ratesRequest(request);
        const mapper = this.convert.ratesResponse();

        const call = callSingle(this.client.getRates.bind(this.client), mapper);
        return publishToPromise(readOnce(this.channel, call, req, this.retries));
    }
}

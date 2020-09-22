import * as grpc from "grpc";
import * as prices_grpc_pb from '../generated/market_grpc_pb';
import {
    ConnectionListener, ConvertMarket, GetRatesRequest,
    GetRatesResponse,
    publishToPromise,
    readOnce
} from "@emeraldpay/api";
import {callSingle, NativeChannel} from "../channel";
import {classFactory} from "./Factory";

export class MarketClient {
    readonly client: prices_grpc_pb.MarketClient;
    readonly channel: NativeChannel;
    private readonly convert = new ConvertMarket(classFactory);

    constructor(address: string, credentials: grpc.ChannelCredentials) {
        this.client = new prices_grpc_pb.MarketClient(address, credentials);
        this.channel = new NativeChannel(this.client);
    }

    public setConnectionListener(listener: ConnectionListener) {
        this.channel.setListener(listener);
    }

    public getRates(request: GetRatesRequest): Promise<GetRatesResponse> {
        const req = this.convert.ratesRequest(request);
        let mapper = this.convert.ratesResponse();

        let call = callSingle(this.client.getRates.bind(this.client), mapper);
        return publishToPromise(readOnce(this.channel, call, req));
    }
}

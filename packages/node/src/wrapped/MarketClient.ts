import * as grpc from "grpc";
import * as prices_grpc_pb from '../generated/market_grpc_pb';
import * as prices_pb from '../generated/market_pb';
import {alwaysRetry, ConnectionListener, publishToPromise, readOnce} from "@emeraldpay/api-client-core";
import {callSingle, callStream, NativeChannel} from "../channel";

export class MarketClient {
    readonly client: prices_grpc_pb.MarketClient;
    readonly channel: NativeChannel;

    constructor(address: string, credentials: grpc.ChannelCredentials) {
        this.client = new prices_grpc_pb.MarketClient(address, credentials);
        this.channel = new NativeChannel(this.client);
    }

    public setConnectionListener(listener: ConnectionListener) {
        this.channel.setListener(listener);
    }

    public getRates(request: prices_pb.GetRatesRequest): Promise<prices_pb.GetRatesResponse> {
        let call = callSingle(this.client.getRates.bind(this.client), (resp: prices_pb.GetRatesResponse) => resp);
        return publishToPromise(readOnce(this.channel, call, request));
    }
}

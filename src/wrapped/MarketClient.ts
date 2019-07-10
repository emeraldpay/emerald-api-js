import * as grpc from "grpc";
import * as prices_grpc_pb from '../generated/market_grpc_pb';
import * as prices_pb from '../generated/market_pb';
import {CallRetry, ConnectionListener, StreamHandler} from "./CallRetry";

export class MarketClient {
    readonly client: prices_grpc_pb.MarketClient;
    readonly callRetry: CallRetry;

    constructor(address: string, credentials: grpc.ChannelCredentials) {
        this.client = new prices_grpc_pb.MarketClient(address, credentials);
        this.callRetry = new CallRetry(this.client);
    }

    public setConnectionListener(listener: ConnectionListener) {
        this.callRetry.setConnectionListener(listener);
    }

    public streamRates(request: prices_pb.GetRateRequest, onConnect: StreamHandler<prices_pb.GetRateReply>) {
        this.callRetry.retryAlways(this.client.streamRates, request, onConnect);
    }
}

import * as grpc from "grpc";
import * as prices_grpc_pb from '../generated/prices_grpc_pb';
import * as prices_pb from '../generated/prices_pb';
import {CallRetry, Connected} from "./CallRetry";

export class PricesClient {
    client: prices_grpc_pb.PricesClient;
    callRetry: CallRetry;

    constructor(address: string, credentials: grpc.ChannelCredentials) {
        this.client = new prices_grpc_pb.PricesClient(address, credentials);
        this.callRetry = new CallRetry(this.client);
    }

    public streamRates(request: prices_pb.GetRateRequest, onConnect: Connected<prices_pb.GetRateReply>) {
        this.callRetry.retryAlways(this.client.streamRates, request, onConnect);
    }
}

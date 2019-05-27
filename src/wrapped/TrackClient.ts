import * as grpc from "grpc";
import * as track_grpc_pb from '../generated/track_grpc_pb';
import * as track_pb from '../generated/track_pb';
import {CallRetry, Connected} from "./CallRetry";

export class TrackClient {
    client: track_grpc_pb.TrackClient;
    callRetry: CallRetry;

    constructor(address: string, credentials: grpc.ChannelCredentials) {
        this.client = new track_grpc_pb.TrackClient(address, credentials);
        this.callRetry = new CallRetry(this.client);
    }

    public trackAccount(request: track_pb.TrackAccountRequest, onConnect: Connected<track_pb.AccountStatus>) {
        this.callRetry.retryAlways(this.client.trackAccount, request, onConnect);
    }

    public trackTx(request: track_pb.TrackTxRequest, onConnect: Connected<track_pb.TxStatus>) {
        this.callRetry.retryAlways(this.client.trackTx, request, onConnect);
    }
}

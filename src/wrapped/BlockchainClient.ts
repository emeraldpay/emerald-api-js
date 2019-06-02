import * as grpc from "grpc";
import * as blockchain_grpc_pb from '../generated/blockchain_grpc_pb';
import * as blockchain_pb from '../generated/blockchain_pb';
import {CallRetry, StreamHandler} from "./CallRetry";
import * as common_pb from "../generated/common_pb";

export class BlockchainClient {
    client: blockchain_grpc_pb.BlockchainClient;
    callRetry: CallRetry;

    constructor(address: string, credentials: grpc.ChannelCredentials) {
        this.client = new blockchain_grpc_pb.BlockchainClient(address, credentials);
        this.callRetry = new CallRetry(this.client);
    }

    public streamHead(request: common_pb.Chain, onConnect: StreamHandler<blockchain_pb.ChainHead>) {
        this.callRetry.retryAlways(this.client.streamHead, request, onConnect);
    }
}

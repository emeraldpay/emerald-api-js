import * as grpc from "grpc";
import * as blockchain_grpc_pb from '../generated/blockchain_grpc_pb';
import * as blockchain_pb from '../generated/blockchain_pb';
import {CallRetry, ConnectionListener, StreamHandler} from "./CallRetry";
import * as common_pb from "../generated/common_pb";

export class BlockchainClient {
    readonly client: blockchain_grpc_pb.BlockchainClient;
    readonly callRetry: CallRetry;

    constructor(address: string, credentials: grpc.ChannelCredentials) {
        this.client = new blockchain_grpc_pb.BlockchainClient(address, credentials);
        this.callRetry = new CallRetry(this.client);
    }

    public setConnectionListener(listener: ConnectionListener) {
        this.callRetry.setConnectionListener(listener);
    }

    public streamHead(request: common_pb.Chain, onConnect: StreamHandler<blockchain_pb.ChainHead>) {
        this.callRetry.retryAlways(this.client.streamHead, request, onConnect);
    }

    public nativeCall(request: blockchain_pb.NativeCallRequest, handler: StreamHandler<blockchain_pb.NativeCallReplyItem>) {
        this.callRetry.retryAlways(this.client.nativeCall, request, handler);
    }

    public streamBalance(request: blockchain_pb.BalanceRequest, onConnect: StreamHandler<blockchain_pb.AddressBalance>) {
        this.callRetry.retryAlways(this.client.streamBalance, request, onConnect);
    }

    public getBalance(request: blockchain_pb.BalanceRequest): Promise<grpc.ClientReadableStream<blockchain_pb.AddressBalance>> {
        return this.callRetry.callOnceReady(this.client.getBalance, request);
    }

    public streamTxStatus(request: blockchain_pb.TxStatusRequest, onConnect: StreamHandler<blockchain_pb.TxStatus>) {
        this.callRetry.retryAlways(this.client.streamTxStatus, request, onConnect);
    }
}

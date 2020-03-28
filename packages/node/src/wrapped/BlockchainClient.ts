import * as grpc from "grpc";
import * as blockchain_grpc_pb from '../generated/blockchain_grpc_pb';
import * as blockchain_pb from '../generated/blockchain_pb';
import * as common_pb from "../generated/common_pb";
import {
    alwaysRetry,
    ChainHead, ConnectionListener,
    Publisher, publishListToPromise,
    publishToPromise,
    readOnce
} from "@emeraldpay/api-client-core";
import {callSingle, callStream, NativeChannel} from "../channel";

export class BlockchainClient {
    readonly client: blockchain_grpc_pb.BlockchainClient;
    readonly channel: NativeChannel;

    constructor(address: string, credentials: grpc.ChannelCredentials) {
        this.client = new blockchain_grpc_pb.BlockchainClient(address, credentials);
        this.channel = new NativeChannel(this.client);
    }

    public setConnectionListener(listener: ConnectionListener) {
        this.channel.setListener(listener);
    }

    public subscribeHead(request: common_pb.Chain): Publisher<ChainHead> {
        let call = callStream(this.client.subscribeHead.bind(this.client), (resp: blockchain_pb.ChainHead) => {
            return {
                chain: request.getType().valueOf(),
                height: resp.getHeight(),
                blockId: resp.getBlockId(),
                timestamp: new Date(resp.getTimestamp())
            } as ChainHead
        });
        return alwaysRetry(this.channel, call, request);
    }

    public nativeCall(request: blockchain_pb.NativeCallRequest): Publisher<blockchain_pb.NativeCallReplyItem> {
        let call = callStream(this.client.nativeCall.bind(this.client), (resp: blockchain_pb.NativeCallReplyItem) => resp);
        return readOnce(this.channel, call, request)
    }

    public subscribeBalance(request: blockchain_pb.BalanceRequest): Publisher<blockchain_pb.AddressBalance> {
        let call = callStream(this.client.subscribeBalance.bind(this.client), (resp: blockchain_pb.AddressBalance) => resp);
        return alwaysRetry(this.channel, call, request);
    }


    public getBalance(request: blockchain_pb.BalanceRequest): Promise<Array<blockchain_pb.AddressBalance>> {
        let call = callStream(this.client.getBalance.bind(this.client), (resp: blockchain_pb.AddressBalance) => resp);
        return publishListToPromise(readOnce(this.channel, call, request));
    }

    public subscribeTxStatus(request: blockchain_pb.TxStatusRequest): Publisher<blockchain_pb.TxStatus> {
        let call = callStream(this.client.subscribeTxStatus, (resp: blockchain_pb.TxStatus) => resp);
        return readOnce(this.channel, call, request);
    }
}

import * as grpc from "grpc";
import * as blockchain_grpc_pb from '../generated/blockchain_grpc_pb';
import * as blockchain_pb from '../generated/blockchain_pb';
import * as common_pb from "../generated/common_pb";
import {
    alwaysRetry,
    Blockchain,
    ChainHead,
    ConnectionListener,
    ConvertBlockchain,
    DataMapper,
    MessageFactory,
    NativeCallError,
    NativeCallItem,
    NativeCallResponse,
    Publisher,
    publishListToPromise,
    publishToPromise,
    readOnce, TxStatusRequest, TxStatusResponse
} from "@emeraldpay/api";
import {callSingle, callStream, NativeChannel} from "../channel";
import {classFactory} from "./Factory";
import {AddressBalance, BalanceRequest} from "@emeraldpay/api";


export class BlockchainClient {
    private readonly client: blockchain_grpc_pb.BlockchainClient;
    private readonly channel: NativeChannel;
    private readonly convert = new ConvertBlockchain(classFactory);

    constructor(address: string, credentials: grpc.ChannelCredentials) {
        this.client = new blockchain_grpc_pb.BlockchainClient(address, credentials);
        this.channel = new NativeChannel(this.client);
    }

    public setConnectionListener(listener: ConnectionListener) {
        this.channel.setListener(listener);
    }

    public subscribeHead(blockchain: Blockchain): Publisher<ChainHead> {
        const req = this.convert.chain(blockchain);
        let mapper: DataMapper<any, ChainHead> = this.convert.headResponse();

        let call = callStream(this.client.subscribeHead.bind(this.client), mapper);
        return alwaysRetry(this.channel, call, req);
    }

    public nativeCall(chain: Blockchain, calls: NativeCallItem[]): Publisher<NativeCallResponse | NativeCallError> {
        let req = this.convert.nativeCallRequest(chain, calls);
        let mapper: DataMapper<any, NativeCallResponse | NativeCallError> = this.convert.nativeCallResponse();

        let call = callStream(this.client.nativeCall.bind(this.client), mapper);
        return readOnce(this.channel, call, req);
    }

    public subscribeBalance(request: BalanceRequest): Publisher<AddressBalance> {
        let protoRequest = this.convert.balanceRequest(request);
        let mapper: DataMapper<blockchain_pb.AddressBalance, AddressBalance> = this.convert.balanceResponse();

        let call = callStream(this.client.subscribeBalance.bind(this.client), mapper);
        return alwaysRetry(this.channel, call, protoRequest);
    }

    public getBalance(request: BalanceRequest): Promise<Array<AddressBalance>> {
        let protoRequest = this.convert.balanceRequest(request);
        let mapper: DataMapper<blockchain_pb.AddressBalance, AddressBalance> = this.convert.balanceResponse();

        let call = callStream(this.client.getBalance.bind(this.client), mapper);
        return publishListToPromise(readOnce(this.channel, call, protoRequest));
    }

    public subscribeTxStatus(request: TxStatusRequest): Publisher<TxStatusResponse> {
        let protoRequest = this.convert.txRequest(request);
        let mapper: DataMapper<blockchain_pb.TxStatus, TxStatusResponse> = this.convert.txResponse();

        let call = callStream(this.client.subscribeTxStatus.bind(this.client), mapper);
        return readOnce(this.channel, call, protoRequest);
    }
}

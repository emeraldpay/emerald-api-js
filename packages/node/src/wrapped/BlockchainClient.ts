import {
    AddressBalance,
    alwaysRetry,
    BalanceRequest,
    Blockchain,
    ChainHead,
    ConnectionListener,
    ConvertBlockchain,
    DataMapper,
    EstimateFeeRequest,
    EstimateFeeResponse,
    NativeCallError,
    NativeCallItem,
    NativeCallResponse,
    Publisher,
    publishListToPromise,
    publishToPromise,
    readOnce,
    TxStatusRequest,
    TxStatusResponse,
} from "@emeraldpay/api";
import * as grpc from "@grpc/grpc-js";
import { callSingle, callStream, NativeChannel } from "../channel";
import * as blockchain_grpc_pb from '../generated/blockchain_grpc_pb';
import * as blockchain_pb from '../generated/blockchain_pb';
import { classFactory } from "./Factory";

export class BlockchainClient {
    readonly client: blockchain_grpc_pb.BlockchainClient;
    readonly channel: NativeChannel;
    readonly retries: number;

    private readonly convert = new ConvertBlockchain(classFactory);

    constructor(address: string, credentials: grpc.ChannelCredentials, retries = 3) {
        this.client = new blockchain_grpc_pb.BlockchainClient(address, credentials);
        this.channel = new NativeChannel(this.client);
        this.retries = retries;
    }

    public setConnectionListener(listener: ConnectionListener) {
        this.channel.setListener(listener);
    }

    public subscribeHead(blockchain: Blockchain): Publisher<ChainHead> {
        const req = this.convert.chain(blockchain);
        const mapper: DataMapper<any, ChainHead> = this.convert.headResponse();

        const call = callStream(this.client.subscribeHead.bind(this.client), mapper);
        return alwaysRetry(this.channel, call, req);
    }

    public nativeCall(chain: Blockchain, calls: NativeCallItem[]): Publisher<NativeCallResponse | NativeCallError> {
        const req = this.convert.nativeCallRequest(chain, calls);
        const mapper: DataMapper<any, NativeCallResponse | NativeCallError> = this.convert.nativeCallResponse();

        const call = callStream(this.client.nativeCall.bind(this.client), mapper);
        return readOnce(this.channel, call, req, this.retries);
    }

    public subscribeBalance(request: BalanceRequest): Publisher<AddressBalance> {
        const protoRequest = this.convert.balanceRequest(request);
        const mapper: DataMapper<blockchain_pb.AddressBalance, AddressBalance> = this.convert.balanceResponse();

        const call = callStream(this.client.subscribeBalance.bind(this.client), mapper);
        return alwaysRetry(this.channel, call, protoRequest);
    }

    public getBalance(request: BalanceRequest): Promise<Array<AddressBalance>> {
        const protoRequest = this.convert.balanceRequest(request);
        const mapper: DataMapper<blockchain_pb.AddressBalance, AddressBalance> = this.convert.balanceResponse();

        const call = callStream(this.client.getBalance.bind(this.client), mapper);
        return publishListToPromise(readOnce(this.channel, call, protoRequest, this.retries));
    }

    public subscribeTxStatus(request: TxStatusRequest): Publisher<TxStatusResponse> {
        const protoRequest = this.convert.txRequest(request);
        const mapper: DataMapper<blockchain_pb.TxStatus, TxStatusResponse> = this.convert.txResponse();

        const call = callStream(this.client.subscribeTxStatus.bind(this.client), mapper);
        return readOnce(this.channel, call, protoRequest, this.retries);
    }

    public estimateFees(request: EstimateFeeRequest): Promise<EstimateFeeResponse> {
        const protoRequest = this.convert.estimateFeeRequest(request);
        const mapper: DataMapper<blockchain_pb.EstimateFeeResponse, EstimateFeeResponse> = this.convert.estimateFeeResponse();

        const call = callSingle(this.client.estimateFee.bind(this.client), mapper);
        return publishToPromise(readOnce(this.channel, call, protoRequest, this.retries));
    }
}

import * as transaction_grpc_pb from "../generated/transaction_grpc_pb";
import {callStream, NativeChannel} from "../channel";
import * as grpc from "@grpc/grpc-js";
import {alwaysRetry, ConnectionListener, Publisher, publishListToPromise, readOnce, transaction} from "@emeraldpay/api";

export class TransactionClient {
    readonly client: transaction_grpc_pb.TransactionClient;
    readonly channel: NativeChannel;
    readonly convert: transaction.Convert;

    constructor(address: string, credentials: grpc.ChannelCredentials) {
        this.client = new transaction_grpc_pb.TransactionClient(address, credentials);
        this.channel = new NativeChannel(this.client);
    }

    public setConnectionListener(listener: ConnectionListener) {
        this.channel.setListener(listener);
    }

    public getBalance(request: transaction.BalanceRequest): Promise<Array<transaction.BalanceResponse>> {
        let protoRequest = this.convert.balanceRequest(request);
        let mapper = this.convert.balanceResponse();

        let call = callStream(this.client.getAddressTx.bind(this.client), mapper);
        return publishListToPromise(readOnce(this.channel, call, protoRequest));
    }

    public getAddressTx(request: transaction.AddressTxRequest): Promise<Array<transaction.AddressTxResponse>> {
        let protoRequest = this.convert.addressTxRequest(request);
        let mapper = this.convert.addressTxResponse();

        let call = callStream(this.client.getAddressTx.bind(this.client), mapper);
        return publishListToPromise(readOnce(this.channel, call, protoRequest));
    }

    public subscribeAddressTx(request: transaction.AddressTxRequest): Publisher<transaction.AddressTxResponse> {
        let protoRequest = this.convert.addressTxRequest(request);
        let mapper = this.convert.addressTxResponse();

        let call = callStream(this.client.subscribeAddressTx.bind(this.client), mapper);
        return alwaysRetry(this.channel, call, protoRequest);
    }

}

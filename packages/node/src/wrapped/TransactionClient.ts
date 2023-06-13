import {alwaysRetry, ConnectionListener, Publisher, publishListToPromise, publishToPromise, readOnce, transaction,} from "@emeraldpay/api";
import * as grpc from "@grpc/grpc-js";
import {callSingle, callStream, NativeChannel} from "../channel";
import * as transaction_grpc_pb from "../generated/transaction_grpc_pb";
import {classFactory} from "./Factory";

export class TransactionClient {
    readonly client: transaction_grpc_pb.TransactionClient;
    readonly channel: NativeChannel;
    readonly retries: number;

    private readonly convert: transaction.Convert = new transaction.Convert(classFactory);

    constructor(address: string, credentials: grpc.ChannelCredentials, retries = 3) {
        this.client = new transaction_grpc_pb.TransactionClient(address, credentials);
        this.channel = new NativeChannel(this.client);
        this.retries = retries;
    }

    public setConnectionListener(listener: ConnectionListener) {
        this.channel.setListener(listener);
    }

    public getBalance(request: transaction.BalanceRequest): Promise<Array<transaction.BalanceResponse>> {
        const protoRequest = this.convert.balanceRequest(request);
        const mapper = this.convert.balanceResponse();

        const call = callStream(this.client.getBalance.bind(this.client), mapper);
        return publishListToPromise(readOnce(this.channel, call, protoRequest, this.retries));
    }

    public getXpubState(request: transaction.XpubStateRequest): Promise<transaction.XpubState> {
        const protoRequest = this.convert.xpubStateRequest(request);
        const mapper = this.convert.xpubState();

        const call = callSingle(this.client.getXpubState.bind(this.client), mapper);
        return publishToPromise(readOnce(this.channel, call, protoRequest, this.retries));
    }

    public getAddressTx(request: transaction.AddressTxRequest): Publisher<transaction.AddressTxResponse> {
        const protoRequest = this.convert.addressTxRequest(request);
        const mapper = this.convert.addressTxResponse();

        const call = callStream(this.client.getAddressTx.bind(this.client), mapper);
        return readOnce(this.channel, call, protoRequest, this.retries);
    }

    public subscribeAddressTx(request: transaction.AddressTxRequest): Publisher<transaction.AddressTxResponse> {
        const protoRequest = this.convert.addressTxRequest(request);
        const mapper = this.convert.addressTxResponse();

        const call = callStream(this.client.subscribeAddressTx.bind(this.client), mapper);
        return readOnce(this.channel, call, protoRequest, this.retries);
    }

    public getAddressTokens(request: transaction.AddressTokenRequest): Publisher<transaction.AddressTokenResponse> {
        const protoRequest = this.convert.addressTokenRequest(request);
        const mapper = this.convert.addressTokenResponse();

        const call = callStream(this.client.getAddressTokens.bind(this.client), mapper);
        return readOnce(this.channel, call, protoRequest, this.retries);
    }

    public subscribeAddressTokens(request: transaction.AddressTokenRequest): Publisher<transaction.AddressTokenResponse> {
        const protoRequest = this.convert.addressTokenRequest(request);
        const mapper = this.convert.addressTokenResponse();

        const call = callStream(this.client.subscribeAddressTokens.bind(this.client), mapper);
        return alwaysRetry(this.channel, call, protoRequest);
    }

    public getAddressAllowance(request: transaction.AddressAllowanceRequest): Promise<Array<transaction.AddressAllowanceResponse>> {
        const protoRequest = this.convert.addressAllowanceRequest(request);
        const mapper = this.convert.addressAllowanceResponse();

        const call = callStream(this.client.getAddressAllowance.bind(this.client), mapper);
        return publishListToPromise(readOnce(this.channel, call, protoRequest, this.retries));
    }

    public subscribeAddressAllowance(request: transaction.AddressAllowanceRequest): Publisher<transaction.AddressAllowanceResponse> {
        const protoRequest = this.convert.addressAllowanceRequest(request);
        const mapper = this.convert.addressAllowanceResponse();

        const call = callStream(this.client.subscribeAddressAllowance.bind(this.client), mapper);
        return alwaysRetry(this.channel, call, protoRequest);
    }

}

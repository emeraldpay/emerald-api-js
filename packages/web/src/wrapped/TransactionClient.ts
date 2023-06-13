import {alwaysRetry, Publisher, publishListToPromise, publishToPromise, readOnce, transaction} from "@emeraldpay/api";
import {callSingle, callStream, WebChannel} from "../channel";
import * as transaction_rpc from "../generated/TransactionServiceClientPb";
import {classFactory} from "./Factory";

export class TransactionClient {
    readonly client: transaction_rpc.TransactionClient;
    readonly channel: WebChannel;
    readonly retries: number;

    private readonly convert: transaction.Convert = new transaction.Convert(classFactory);

    constructor(hostname: string, channel: WebChannel, retries = 3) {
        this.client = new transaction_rpc.TransactionClient(hostname);
        this.channel = channel;
        this.retries = retries;
    }

    public getBalance(request: transaction.BalanceRequest): Promise<Array<transaction.BalanceResponse>> {
        const protoRequest = this.convert.balanceRequest(request);
        const mapper = this.convert.balanceResponse();

        const call = callStream(this.client.getAddressTx.bind(this.client), mapper);
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

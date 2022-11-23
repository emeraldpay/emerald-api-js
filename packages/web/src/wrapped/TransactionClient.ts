import * as transaction_rpc from "../generated/TransactionServiceClientPb";
import {callSingle, callStream, WebChannel} from "../channel";
import {Publisher, publishListToPromise, publishToPromise, readOnce, transaction} from "@emeraldpay/api";
import {classFactory} from "./Factory";

export class TransactionClient {
    private readonly client: transaction_rpc.TransactionClient;
    private readonly channel: WebChannel;
    private readonly convert: transaction.Convert;

    constructor(hostname: string, channel: WebChannel) {
        this.client = new transaction_rpc.TransactionClient(hostname);
        this.channel = channel;
        this.convert = new transaction.Convert(classFactory)
    }

    public getBalance(request: transaction.BalanceRequest): Promise<Array<transaction.BalanceResponse>> {
        let protoRequest = this.convert.balanceRequest(request);
        let mapper = this.convert.balanceResponse();

        let call = callStream(this.client.getAddressTx.bind(this.client), mapper);
        return publishListToPromise(readOnce(this.channel, call, protoRequest));
    }

    public getXpubState(request: transaction.XpubStateRequest): Promise<transaction.XpubState> {
        let protoRequest = this.convert.xpubStateRequest(request);
        let mapper = this.convert.xpubState();

        let call = callSingle(this.client.getXpubState.bind(this.client), mapper);
        return publishToPromise(readOnce(this.channel, call, protoRequest));
    }

    public getAddressTx(request: transaction.AddressTxRequest): Publisher<transaction.AddressTxResponse> {
        let protoRequest = this.convert.addressTxRequest(request);
        let mapper = this.convert.addressTxResponse();

        let call = callStream(this.client.getAddressTx.bind(this.client), mapper);
        return readOnce(this.channel, call, protoRequest);
    }

    public subscribeAddressTx(request: transaction.AddressTxRequest): Publisher<transaction.AddressTxResponse> {
        let protoRequest = this.convert.addressTxRequest(request);
        let mapper = this.convert.addressTxResponse();

        let call = callStream(this.client.subscribeAddressTx.bind(this.client), mapper);
        return readOnce(this.channel, call, protoRequest);
    }

}

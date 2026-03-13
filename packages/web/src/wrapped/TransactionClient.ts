import { ConvertMarket, Publisher, readOnce, transaction } from "@emeraldpay/api";
import { callPromise, callStream, WebChannel } from "../channel";
import * as transaction_rpc from '../generated/TransactionServiceClientPb';
import { classFactory } from "./Factory";
import { CredentialsContext } from "../credentials";

import { ConvertTransaction } from "@emeraldpay/api/lib/typesTransaction";

export class TransactionClient {
  readonly client: transaction_rpc.TransactionClient;
  readonly channel: WebChannel;
  readonly retries: number;

  private readonly convert = new ConvertTransaction(classFactory);

  constructor(hostname: string, channel: WebChannel, credentials: CredentialsContext, retries = 3) {
    this.client = new transaction_rpc.TransactionClient(hostname, null, credentials.options);
    this.channel = channel;
    this.retries = retries;
  }

  public getTransactions(request: transaction.GetTransactionsRequest): Publisher<transaction.AddressTransaction> {
    const protoRequest = this.convert.getTransactionsRequest(request);
    const mapper = this.convert.addressTransaction();

    const call = callStream(this.client.getTransactions.bind(this.client), mapper);
    return readOnce(this.channel, call, protoRequest, this.retries);
  }

  public subscribeTransactions(request: transaction.SubscribeTransactionsRequest): Publisher<transaction.AddressTransaction> {
    const protoRequest = this.convert.subscribeTransactionsRequest(request);
    const mapper = this.convert.addressTransaction();

    const call = callStream(this.client.subscribeTransactions.bind(this.client), mapper);
    return readOnce(this.channel, call, protoRequest, this.retries);
  }

}

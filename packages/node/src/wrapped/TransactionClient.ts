import {
  ConnectionListener,
  Publisher,
  publishListToPromise,
  publishToPromise,
  readOnce,
  transaction,
} from '@emeraldpay/api';
import { ChannelCredentials } from '@grpc/grpc-js';
import { NativeChannel, callSingle, callStream } from '../channel';
import { TransactionClient as ProtoTransactionClient } from '../generated/transaction_grpc_pb';
import { classFactory } from './Factory';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: clientVersion } = require('../../package.json');

export class TransactionClient {
  readonly client: ProtoTransactionClient;
  readonly channel: NativeChannel;
  readonly credentials: ChannelCredentials;
  readonly retries: number;

  private readonly convert: transaction.Convert = new transaction.Convert(classFactory);

  constructor(address: string, credentials: ChannelCredentials, agents: string[], retries = 3) {
    const agent = [...agents, `emerald-client-node/${clientVersion}`].join(' ');

    this.client = new ProtoTransactionClient(address, credentials, { 'grpc.primary_user_agent': agent });
    this.channel = new NativeChannel(this.client);
    this.credentials = credentials;
    this.retries = retries;
  }

  public setConnectionListener(listener: ConnectionListener): void {
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

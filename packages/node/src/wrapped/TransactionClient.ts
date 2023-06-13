import {
  ConnectionListener,
  Publisher,
  alwaysRetry,
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

  public getAddressAllowance(
    request: transaction.AddressAllowanceRequest,
  ): Promise<Array<transaction.AddressAllowanceResponse>> {
    const protoRequest = this.convert.addressAllowanceRequest(request);
    const mapper = this.convert.addressAllowanceResponse();

    const call = callStream(this.client.getAddressAllowance.bind(this.client), mapper);
    return publishListToPromise(readOnce(this.channel, call, protoRequest, this.retries));
  }

  public subscribeAddressAllowance(
    request: transaction.AddressAllowanceRequest,
  ): Publisher<transaction.AddressAllowanceResponse> {
    const protoRequest = this.convert.addressAllowanceRequest(request);
    const mapper = this.convert.addressAllowanceResponse();

    const call = callStream(this.client.subscribeAddressAllowance.bind(this.client), mapper);
    return alwaysRetry(this.channel, call, protoRequest);
  }
}

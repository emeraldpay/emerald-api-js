import { ConnectionListener, Publisher, alwaysRetry, publishToPromise, readOnce, token, } from '@emeraldpay/api';
import { ChannelCredentials } from '@grpc/grpc-js';
import { NativeChannel, callSingle, callStream } from '../channel';
import { TokenClient as ProtoTokenClient } from '../generated/token_grpc_pb';
import { classFactory } from './Factory';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: clientVersion } = require('../../package.json');

export class TokenClient {
  readonly client: ProtoTokenClient;
  readonly channel: NativeChannel;
  readonly credentials: ChannelCredentials;
  readonly retries: number;

  private readonly convert: token.Convert = new token.Convert(classFactory);

  constructor(address: string, credentials: ChannelCredentials, agents: string[], retries = 3) {
    const agent = [...agents, `emerald-client-node/${clientVersion}`].join(' ');

    this.client = new ProtoTokenClient(address, credentials, { 'grpc.primary_user_agent': agent });
    this.channel = new NativeChannel(this.client);
    this.credentials = credentials;
    this.retries = retries;
  }

  public setConnectionListener(listener: ConnectionListener): void {
    this.channel.setListener(listener);
  }

  public getTokens(request: token.AddressTokenRequest): Promise<token.AddressToken> {
    const protoRequest = this.convert.addressTokenRequest(request);
    const mapper = this.convert.addressToken();

    const call = callSingle(this.client.getTokens.bind(this.client), mapper);
    return publishToPromise(readOnce(this.channel, call, protoRequest, this.retries));
  }

  public subscribeTokens(request: token.AddressTokenRequest): Publisher<token.AddressToken> {
    const protoRequest = this.convert.addressTokenRequest(request);
    const mapper = this.convert.addressToken();

    const call = callStream(this.client.subscribeTokens.bind(this.client), mapper);
    return alwaysRetry(this.channel, call, protoRequest, this.retries);
  }

  public getAllowanceTokens(request: token.AddressAllowanceRequest): Promise<token.AddressAllowanceToken> {
    const protoRequest = this.convert.addressAllowanceRequest(request);
    const mapper = this.convert.addressAllowanceToken();

    const call = callSingle(this.client.getAllowanceTokens.bind(this.client), mapper);
    return publishToPromise(readOnce(this.channel, call, protoRequest, this.retries));
  }

  public subscribeAllowanceTokens(request: token.AddressAllowanceRequest): Publisher<token.AddressAllowanceToken> {
    const protoRequest = this.convert.addressAllowanceRequest(request);
    const mapper = this.convert.addressAllowanceToken();

    const call = callStream(this.client.subscribeAllowanceTokens.bind(this.client), mapper);
    return alwaysRetry(this.channel, call, protoRequest, this.retries);
  }

  public getAllowanceAmounts(request: token.AddressAllowanceRequest): Publisher<token.AddressAllowanceAmount> {
    const protoRequest = this.convert.addressAllowanceRequest(request);
    const mapper = this.convert.addressAllowanceAmount();

    const call = callStream(this.client.getAllowanceAmounts.bind(this.client), mapper);
    return readOnce(this.channel, call, protoRequest, this.retries);
  }

  public subscribeAllowanceAmounts(request: token.AddressAllowanceRequest): Publisher<token.AddressAllowanceAmount> {
    const protoRequest = this.convert.addressAllowanceRequest(request);
    const mapper = this.convert.addressAllowanceAmount();

    const call = callStream(this.client.subscribeAllowanceAmounts.bind(this.client), mapper);
    return alwaysRetry(this.channel, call, protoRequest, this.retries);
  }
}

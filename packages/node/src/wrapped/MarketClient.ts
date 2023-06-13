import {
  ConnectionListener,
  ConvertMarket,
  GetRatesRequest,
  GetRatesResponse,
  publishToPromise,
  readOnce,
} from '@emeraldpay/api';
import { ChannelCredentials } from '@grpc/grpc-js';
import { NativeChannel, callSingle } from '../channel';
import { MarketClient as ProtoMarketClient } from '../generated/market_grpc_pb';
import { classFactory } from './Factory';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: clientVersion } = require('../../package.json');

export class MarketClient {
  readonly client: ProtoMarketClient;
  readonly channel: NativeChannel;
  readonly credentials: ChannelCredentials;
  readonly retries: number;

  private readonly convert = new ConvertMarket(classFactory);

  constructor(address: string, credentials: ChannelCredentials, agents: string[], retries = 3) {
    const agent = [...agents, `emerald-client-node/${clientVersion}`].join(' ');

    this.client = new ProtoMarketClient(address, credentials, { 'grpc.primary_user_agent': agent });
    this.channel = new NativeChannel(this.client);
    this.credentials = credentials;
    this.retries = retries;
  }

  public setConnectionListener(listener: ConnectionListener): void {
    this.channel.setListener(listener);
  }

  public getRates(request: GetRatesRequest): Promise<GetRatesResponse> {
    const ratesRequest = this.convert.ratesRequest(request);
    const mapper = this.convert.ratesResponse();

    const call = callSingle(this.client.getRates.bind(this.client), mapper);
    return publishToPromise(readOnce(this.channel, call, ratesRequest, this.retries));
  }
}

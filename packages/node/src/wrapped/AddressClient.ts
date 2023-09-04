import {
  ConnectionListener,
  address,
  publishToPromise,
  readOnce,
} from '@emeraldpay/api';
import { ChannelCredentials } from '@grpc/grpc-js';
import { NativeChannel, callSingle } from '../channel';
import { AddressClient as ProtoAddressClient } from '../generated/address_grpc_pb';
import { classFactory } from './Factory';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: clientVersion } = require('../../package.json');

export class AddressClient {
  readonly client: ProtoAddressClient;
  readonly channel: NativeChannel;
  readonly credentials: ChannelCredentials;
  readonly retries: number;

  private readonly convert: address.ConvertAddress = new address.ConvertAddress(classFactory);

  constructor(hostname: string, credentials: ChannelCredentials, agents: string[], retries = 3) {
    const agent = [...agents, `emerald-client-node/${clientVersion}`].join(' ');

    this.client = new ProtoAddressClient(hostname, credentials, { 'grpc.primary_user_agent': agent });
    this.channel = new NativeChannel(this.client);
    this.credentials = credentials;
    this.retries = retries;
  }

  setConnectionListener(listener: ConnectionListener): void {
    this.channel.setListener(listener);
  }

  describe(request: address.DescribeRequest): Promise<address.DescribeResponse> {
    const protoRequest = this.convert.describeRequest(request);
    const mapper = this.convert.describeResponse();

    const call = callSingle(this.client.describe.bind(this.client), mapper);
    return publishToPromise(readOnce(this.channel, call, protoRequest, this.retries));
  }

  public describeXpub(request: address.DescribeXpubRequest): Promise<address.DescribeXpubResponse> {
    const protoRequest = this.convert.describeXpubRequest(request);
    const mapper = this.convert.describeXpubResponse();

    const call = callSingle(this.client.describeXpub.bind(this.client), mapper);
    return publishToPromise(readOnce(this.channel, call, protoRequest, this.retries));
  }
}

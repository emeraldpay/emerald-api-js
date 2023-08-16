import {
  ConnectionListener,
  ConvertDescribeAddress,
  DataMapper,
  DescribeAddressRequest,
  DescribeAddressResponse,
  publishToPromise,
  readOnce,
} from '@emeraldpay/api';
import { ChannelCredentials } from '@grpc/grpc-js';
import { NativeChannel, callSingle } from '../channel';
import { DescribeResponse } from '../generated/address.message_pb';
import { AddressClient as ProtoAddressClient } from '../generated/address_grpc_pb';
import { classFactory } from './Factory';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: clientVersion } = require('../../package.json');

export class AddressClient {
  readonly client: ProtoAddressClient;
  readonly channel: NativeChannel;
  readonly credentials: ChannelCredentials;
  readonly retries: number;

  private readonly convert = new ConvertDescribeAddress(classFactory);

  constructor(address: string, credentials: ChannelCredentials, agents: string[], retries = 3) {
    const agent = [...agents, `emerald-client-node/${clientVersion}`].join(' ');

    this.client = new ProtoAddressClient(address, credentials, { 'grpc.primary_user_agent': agent });
    this.channel = new NativeChannel(this.client);
    this.credentials = credentials;
    this.retries = retries;
  }

  setConnectionListener(listener: ConnectionListener): void {
    this.channel.setListener(listener);
  }

  describeAddress(request: DescribeAddressRequest): Promise<DescribeAddressResponse> {
    const protoRequest = this.convert.addressRequest(request);
    const mapper: DataMapper<DescribeResponse, DescribeAddressResponse> = this.convert.addressResponse();

    const call = callSingle(this.client.describe.bind(this.client), mapper);
    return publishToPromise(readOnce(this.channel, call, protoRequest, this.retries));
  }
}

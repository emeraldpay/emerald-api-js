import { ConnectionListener, publishToPromise, readOnce } from '@emeraldpay/api';
import * as grpc from '@grpc/grpc-js';
import { NativeChannel, callSingle } from '../channel';
import { AuthClient as ProtoAuthClient } from '../generated/auth_grpc_pb';
import { AuthRequest as ProtoAuthRequest, AuthResponse as ProtoAuthResponse } from '../generated/auth_pb';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: clientVersion } = require('../../package.json');

export class AuthClient {
  readonly client: ProtoAuthClient;
  readonly channel: NativeChannel;
  readonly retries: number;

  constructor(address: string, credentials: grpc.ChannelCredentials, agent: string[], retries = 3) {
    agent.push(`emerald-client-node/${clientVersion}`);

    this.client = new ProtoAuthClient(address, credentials, { 'grpc.primary_user_agent': agent.join(' ') });
    this.channel = new NativeChannel(this.client);
    this.retries = retries;
  }

  public setConnectionListener(listener: ConnectionListener): void {
    this.channel.setListener(listener);
  }

  public authenticate(request: ProtoAuthRequest): Promise<ProtoAuthResponse> {
    const call = callSingle(this.client.authenticate.bind(this.client), (resp: ProtoAuthResponse) => resp);
    return publishToPromise(readOnce(this.channel, call, request, this.retries));
  }
}

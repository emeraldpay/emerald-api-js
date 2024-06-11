import { ConnectionListener, publishToPromise, readOnce } from '@emeraldpay/api';
import { ChannelCredentials } from '@grpc/grpc-js';
import { NativeChannel, callSingle } from '../channel';
import { AuthClient as ProtoAuthClient } from '../generated/auth_grpc_pb';
import {
  AuthRequest as ProtoAuthRequest,
  AuthResponse as ProtoAuthResponse,
  RefreshRequest as ProtoRefreshRequest,
} from '../generated/auth_pb';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: clientVersion } = require('../../package.json');

export class AuthClient {
  readonly client: ProtoAuthClient;
  readonly channel: NativeChannel;
  readonly credentials: ChannelCredentials;
  readonly retries: number;

  constructor(address: string, credentials: ChannelCredentials, agents: string[], retries = 3) {
    const agent = [...agents, `emerald-client-node/${clientVersion}`].join(' ');

    this.client = new ProtoAuthClient(address, credentials, { 'grpc.primary_user_agent': agent });
    this.channel = new NativeChannel(this.client);
    this.credentials = credentials;
    this.retries = retries;
  }

  public setConnectionListener(listener: ConnectionListener): void {
    this.channel.setListener(listener);
  }

  public authenticate(request: ProtoAuthRequest): Promise<ProtoAuthResponse> {
    const call = callSingle(this.client.authenticate.bind(this.client), (resp: ProtoAuthResponse) => resp);
    return publishToPromise(readOnce(this.channel, call, request, this.retries));
  }

  public refresh(request: ProtoRefreshRequest): Promise<ProtoAuthResponse> {
    const call = callSingle(this.client.refresh.bind(this.client), (resp: ProtoAuthResponse) => resp);
    return publishToPromise(readOnce(this.channel, call, request, this.retries));
  }

}

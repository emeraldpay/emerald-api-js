import { ConnectionListener, publishToPromise, readOnce } from '@emeraldpay/api';
import * as grpc from '@grpc/grpc-js';
import { NativeChannel, callSingle } from '../channel';
import * as auth_grpc_pb from '../generated/auth_grpc_pb';
import * as auth_pb from '../generated/auth_pb';

export class AuthClient {
  readonly client: auth_grpc_pb.AuthClient;
  readonly channel: NativeChannel;
  readonly retries: number;

  constructor(address: string, credentials: grpc.ChannelCredentials, retries = 3) {
    this.client = new auth_grpc_pb.AuthClient(address, credentials);
    this.channel = new NativeChannel(this.client);
    this.retries = retries;
  }

  public setConnectionListener(listener: ConnectionListener): void {
    this.channel.setListener(listener);
  }

  public authenticate(request: auth_pb.AuthRequest): Promise<auth_pb.AuthResponse> {
    const call = callSingle(this.client.authenticate.bind(this.client), (resp: auth_pb.AuthResponse) => resp);
    return publishToPromise(readOnce(this.channel, call, request, this.retries));
  }
}

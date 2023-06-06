import { ConnectionListener, publishToPromise, readOnce } from '@emeraldpay/api';
import * as grpc from '@grpc/grpc-js';
import { NativeChannel, callSingle } from '../channel';
import * as monitoring_grpc_pb from '../generated/monitoring_grpc_pb';
import * as monitoring_pb from '../generated/monitoring_pb';

export class MonitoringClient {
  readonly client: monitoring_grpc_pb.MonitoringClient;
  readonly channel: NativeChannel;
  readonly retries: number;

  constructor(address: string, credentials: grpc.ChannelCredentials, retries = 3) {
    this.client = new monitoring_grpc_pb.MonitoringClient(address, credentials);
    this.channel = new NativeChannel(this.client);
    this.retries = retries;
  }

  public setConnectionListener(listener: ConnectionListener): void {
    this.channel.setListener(listener);
  }

  public ping(): Promise<boolean> {
    const request = new monitoring_pb.PingRequest();

    const call = callSingle(this.client.ping.bind(this.client), () => true);
    return publishToPromise(readOnce(this.channel, call, request, this.retries));
  }
}

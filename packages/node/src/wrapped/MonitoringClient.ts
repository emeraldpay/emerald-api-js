import { ConnectionListener, publishToPromise, readOnce } from '@emeraldpay/api';
import * as grpc from '@grpc/grpc-js';
import { NativeChannel, callSingle } from '../channel';
import { MonitoringClient as ProtoMonitoringClient } from '../generated/monitoring_grpc_pb';
import { PingRequest as ProtoPingRequest } from '../generated/monitoring_pb';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: clientVersion } = require('../package.json');

export class MonitoringClient {
  readonly client: ProtoMonitoringClient;
  readonly channel: NativeChannel;
  readonly retries: number;

  constructor(address: string, credentials: grpc.ChannelCredentials, agent: string[], retries = 3) {
    agent.push(`emerald-client-node/${clientVersion}`);

    this.client = new ProtoMonitoringClient(address, credentials, { 'grpc.primary_user_agent': agent.join(' ') });
    this.channel = new NativeChannel(this.client);
    this.retries = retries;
  }

  public setConnectionListener(listener: ConnectionListener): void {
    this.channel.setListener(listener);
  }

  public ping(): Promise<boolean> {
    const request = new ProtoPingRequest();

    const call = callSingle(this.client.ping.bind(this.client), () => true);
    return publishToPromise(readOnce(this.channel, call, request, this.retries));
  }
}

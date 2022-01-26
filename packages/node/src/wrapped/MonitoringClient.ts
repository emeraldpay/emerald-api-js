import * as grpc from "@grpc/grpc-js";
import * as monitoring_grpc_pb from '../generated/monitoring_grpc_pb';
import * as monitoring_pb from '../generated/monitoring_pb';
import {ConnectionListener, publishToPromise, readOnce} from "@emeraldpay/api";
import {callSingle, NativeChannel} from "../channel";

export class MonitoringClient {
    readonly client: monitoring_grpc_pb.MonitoringClient;
    readonly channel: NativeChannel;

    constructor(address: string, credentials: grpc.ChannelCredentials) {
        this.client = new monitoring_grpc_pb.MonitoringClient(address, credentials);
        this.channel = new NativeChannel(this.client);
    }

    public setConnectionListener(listener: ConnectionListener) {
        this.channel.setListener(listener);
    }

    public ping(): Promise<boolean> {
        const req = new monitoring_pb.PingRequest();

        let call = callSingle(this.client.ping.bind(this.client), (resp: monitoring_pb.PongResponse) => true);
        return publishToPromise(readOnce(this.channel, call, req));
    }
}

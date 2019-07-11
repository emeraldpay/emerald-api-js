import * as grpc from "grpc";
import * as monitoring_grpc_pb from '../generated/monitoring_grpc_pb';
import * as monitoring_pb from '../generated/monitoring_pb';
import {CallRetry, ConnectionListener} from "./CallRetry";

export class MonitoringClient {
    readonly client: monitoring_grpc_pb.MonitoringClient;
    readonly callRetry: CallRetry;

    constructor(address: string, credentials: grpc.ChannelCredentials) {
        this.client = new monitoring_grpc_pb.MonitoringClient(address, credentials);
        this.callRetry = new CallRetry(this.client);
    }

    public setConnectionListener(listener: ConnectionListener) {
        this.callRetry.setConnectionListener(listener);
    }

    public ping() {
        const req = new monitoring_pb.PingRequest();
        this.callRetry.callOnceReady(this.client.ping, req)
            .then((_) => {})
            .catch((_) => {});
    }
}

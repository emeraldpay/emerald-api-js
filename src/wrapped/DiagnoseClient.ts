import * as grpc from "grpc";
import * as diagnose_grpc_pb from '../generated/diagnose_grpc_pb';
import * as diagnose_pb from '../generated/diagnose_pb';
import {CallRetry, ConnectionListener} from "./CallRetry";

export class DiagnoseClient {
    readonly client: diagnose_grpc_pb.DiagnoseClient;
    readonly callRetry: CallRetry;

    constructor(address: string, credentials: grpc.ChannelCredentials) {
        this.client = new diagnose_grpc_pb.DiagnoseClient(address, credentials);
        this.callRetry = new CallRetry(this.client);
    }

    public setConnectionListener(listener: ConnectionListener) {
        this.callRetry.setConnectionListener(listener);
    }

    public ping() {
        const req = new diagnose_pb.PingRequest();
        this.callRetry.callOnceReady(this.client.ping, req)
            .then((_) => {})
            .catch((_) => {});
    }
}

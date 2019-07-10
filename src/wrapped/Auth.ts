import * as grpc from "grpc";
import * as auth_grpc_pb from '../generated/auth_grpc_pb';
import * as auth_pb from '../generated/auth_pb';
import {CallRetry, ConnectionListener} from "./CallRetry";


export class AuthClient {
    readonly client: auth_grpc_pb.AuthClient;
    readonly callRetry: CallRetry;

    constructor(address: string, credentials: grpc.ChannelCredentials) {
        this.client = new auth_grpc_pb.AuthClient(address, credentials);
        this.callRetry = new CallRetry(this.client);
    }

    public setConnectionListener(listener: ConnectionListener) {
        this.callRetry.setConnectionListener(listener);
    }

    public authenticate(request: auth_pb.AuthRequest): Promise<auth_pb.AuthResponse> {
        return this.callRetry.callOnceReady(this.client.authenticate, request);
    }
}
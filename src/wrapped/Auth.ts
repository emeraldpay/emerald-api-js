import * as grpc from "grpc";
import * as auth_grpc_pb from '../generated/auth_grpc_pb';
import * as auth_pb from '../generated/auth_pb';
import {CallRetry} from "./CallRetry";


export class AuthClient {
    client: auth_grpc_pb.AuthClient;
    callRetry: CallRetry;

    constructor(address: string, credentials: grpc.ChannelCredentials) {
        this.client = new auth_grpc_pb.AuthClient(address, credentials);
        this.callRetry = new CallRetry(this.client);
    }

    public authenticate(request: auth_pb.AuthRequest): Promise<auth_pb.AuthResponse> {
        return this.callRetry.callOnceReady(this.client.authenticate, request);
    }
}
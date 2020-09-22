import * as grpc from "grpc";
import * as auth_grpc_pb from '../generated/auth_grpc_pb';
import * as auth_pb from '../generated/auth_pb';
import {ConnectionListener, Publisher, publishToPromise, readOnce} from "@emeraldpay/api";
import {callSingle, NativeChannel} from "../channel";

export class AuthClient {
    readonly client: auth_grpc_pb.AuthClient;
    readonly channel: NativeChannel;

    constructor(address: string, credentials: grpc.ChannelCredentials) {
        this.client = new auth_grpc_pb.AuthClient(address, credentials);
        this.channel = new NativeChannel(this.client);
    }

    public setConnectionListener(listener: ConnectionListener) {
        this.channel.setListener(listener);
    }

    public authenticate(request: auth_pb.AuthRequest): Promise<auth_pb.AuthResponse> {
        let call = callSingle(this.client.authenticate.bind(this.client), (resp: auth_pb.AuthResponse) => {
            return resp
        });
        let result = readOnce(this.channel, call, request);
        return publishToPromise(result)
    }
}
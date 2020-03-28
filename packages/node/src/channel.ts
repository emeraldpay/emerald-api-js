import {
    Channel, ConnectionListener,
    ConnectivityState,
    DataMapper,
    ManagedPublisher, MappingPublisher,
    Publisher, RemoteCall,
    StateListener
} from "@emeraldpay/api-client-core";
import * as grpc from "grpc";
import {Call, ClientReadableStream, ClientUnaryCall} from "grpc";
import {Readable} from "stream";

function fromConnectivityState(state: ConnectivityState): grpc.connectivityState {
    if (state === ConnectivityState.CONNECTING) {
        return grpc.connectivityState.CONNECTING;
    } else if (state === ConnectivityState.IDLE) {
        return grpc.connectivityState.IDLE;
    } else if (state === ConnectivityState.READY) {
        return grpc.connectivityState.READY;
    } else if (state === ConnectivityState.SHUTDOWN) {
        return grpc.connectivityState.SHUTDOWN;
    } else if (state === ConnectivityState.TRANSIENT_FAILURE) {
        return grpc.connectivityState.TRANSIENT_FAILURE
    } else {
        throw Error("Unsupported state: " + state)
    }
}

function toConnectivityState(state: grpc.connectivityState): ConnectivityState {
    if (state === grpc.connectivityState.CONNECTING) {
        return ConnectivityState.CONNECTING;
    } else if (state === grpc.connectivityState.IDLE) {
        return ConnectivityState.IDLE;
    } else if (state === grpc.connectivityState.READY) {
        return ConnectivityState.READY;
    } else if (state === grpc.connectivityState.SHUTDOWN) {
        return ConnectivityState.SHUTDOWN;
    } else if (state === grpc.connectivityState.TRANSIENT_FAILURE) {
        return ConnectivityState.TRANSIENT_FAILURE
    } else {
        throw Error("Unsupported state: " + state)
    }
}

export class NativeChannel implements Channel {
    private readonly client: grpc.Client;

    constructor(client: grpc.Client) {
        this.client = client;
    }

    getState(): ConnectivityState {
        let state = this.client.getChannel().getConnectivityState(true);
        return toConnectivityState(state);
    }

    watch(current: ConnectivityState, deadline: number, handler: StateListener): any {
        this.client.getChannel().watchConnectivityState(current.valueOf(), Date.now() + deadline, (err) => {
            const connStateNew = this.client.getChannel().getConnectivityState(true);
            handler(err, toConnectivityState(connStateNew));
        });
    }

    setListener(listener: ConnectionListener) {
        //TODO
    }
}

class NativeStreamPublisher<T> extends ManagedPublisher<T> implements Publisher<T> {
    constructor(reader: ClientReadableStream<T>) {
        super();
        reader
            .on("data", (data) => super.emitData(data))
            .on("error", (err) => super.emitJsError(err))
            .on("end", () => super.emitClosed());
    }
}

class NativeCallPublisher<T> extends ManagedPublisher<T>
    implements Publisher<T> {

    handler(): SingleCallback<T> {
        return (err, data) => {
            if (err) {
                this.emitJsError(err)
            } else {
                this.emitData(data)
            }
            this.emitClosed()
        }
    }
}

// Example:
// public subscribeHead(request: common_pb.Chain, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<blockchain_pb.ChainHead>;
//
export function callStream<R, I, O>(delegate: (req: R) => ClientReadableStream<I>, mapper: DataMapper<I, O>): RemoteCall<R, O> {
    return (req) => {
        let source: Publisher<I> = new NativeStreamPublisher(delegate(req));
        return new MappingPublisher(source, mapper);
    }
}

type SingleCallback<T> = (error: grpc.ServiceError | null, response: T) => void

// Example:
// public authenticate(request: auth_pb.AuthRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: auth_pb.AuthResponse) => void): grpc.ClientUnaryCall;
//
export function callSingle<R, I, O>(delegate: (req: R, metadata: grpc.Metadata, callback: SingleCallback<I>) => ClientUnaryCall, mapper: DataMapper<I, O>): RemoteCall<R, O> {
    return (req) => {
        let source = new NativeCallPublisher();
        delegate(req, null, source.handler());
        return new MappingPublisher(source, mapper)
    }
}
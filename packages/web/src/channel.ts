import {
    Channel,
    ConnectivityState,
    DataMapper,
    ManagedPublisher,
    MappingPublisher,
    PromisePublisher,
    Publisher,
    RemoteCall,
} from "@emeraldpay/api";
import { ClientReadableStream } from "grpc-web";

export class WebChannel implements Channel {
    getState(): ConnectivityState {
        return ConnectivityState.READY;
    }

    watch(current: ConnectivityState, deadline: number, handler: (err: any, state: ConnectivityState) => void): any {
        setTimeout(() => {
            handler(null, this.getState())
        }, 100)
    }
}

class WebStreamPublisher<T> extends ManagedPublisher<T> implements Publisher<T> {
    constructor(reader: ClientReadableStream<T>) {
        super();
        reader
            .on("data", (data) => super.emitData(data))
            .on("error", (err) => super.emitError(err))
            .on("end", () => super.emitClosed());
    }
}

export function createPublisher<I, O>(reader: ClientReadableStream<I>, mapper: DataMapper<I, O>): Publisher<O> {
    const source = new WebStreamPublisher(reader);
    return new MappingPublisher(source, mapper);
}

export function callStream<R, I, O>(delegate: (req: R) => ClientReadableStream<I>, mapper: DataMapper<I, O>): RemoteCall<R, O> {
    return (req) => {
        return createPublisher(delegate(req), mapper);
    }
}

export function callSingle<R, I, O>(delegate: (req: R) => ClientReadableStream<I>, mapper: DataMapper<I, O>): RemoteCall<R, O> {
    return (req) => {
        return createPublisher(delegate(req), mapper);
    }
}

export function callPromise<R, I, O>(delegate: (req: R) => Promise<I>, mapper: DataMapper<I, O>): RemoteCall<R, O> {
    return (req) => {
        const source = new PromisePublisher(delegate(req));
        return new MappingPublisher(source, mapper);
    }
}

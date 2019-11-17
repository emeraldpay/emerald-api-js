import {
    AlwaysRepeat,
    Channel,
    ConnectivityState,
    DataMapper,
    ManagedPublisher,
    MappingPublisher, OnceSuccess,
    Publisher,
    RemoteCall, Retry, StandardExecutor
} from "@emeraldpay/api-client-core";
import {ClientReadableStream} from "grpc-web";

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

export function alwaysRetry<T, R>(channel: WebChannel, call: RemoteCall<R, T>, req: R): Publisher<T> {
    const reconnect = new AlwaysRepeat();
    const executor = new StandardExecutor(reconnect, call, req);
    const retry = new Retry(channel, executor, reconnect);
    retry.callWhenReady();
    return executor;
}

export function readOnce<T, R>(channel: WebChannel, call: RemoteCall<R, T>, req: R): Publisher<T> {
    const once = new OnceSuccess();
    const executor = new StandardExecutor(once, call, req);
    const retry = new Retry(channel, executor, once);
    retry.callWhenReady();
    return executor;
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

export function publishToPromise<T>(publisher: Publisher<T>): Promise<T> {
    let closed = false;
    return new Promise((resolve, reject) => {
        publisher.onData((data) => {
            if (closed) return;
            resolve(data);
            closed = true;
        });
        publisher.onError((err) => {
            if (closed) return;
            reject(err);
            closed = true;
        });
        publisher.finally(() => {
            if (closed) return;
            reject(new Error("Not executed"));
            closed = true;
        })
    })
}
import * as grpc from "./grpcReimports";

export interface Publisher<T> {
    cancel()
    onData(handler: Handler<T>): Publisher<T>
    onError(handler: Handler<grpc.Error>): Publisher<T>
    finally(handler: () => void): Publisher<T>
}

export type DataMapper<I, O> = (data: I) => O;
export type Handler<T> = (value: T) => void;

function linkedHandler<T>(current: Handler<T>, additional: Handler<T>): Handler<T> {
    if (current == null) {
        return additional;
    }
    if (additional == null) {
        return current;
    }
    return (value: T) => {
        let err = null;
        try {
            current(value)
        } catch (e) {
            err = e;
        }
        try {
            additional(value)
        } catch (e) {
            err = e;
        }
        if (err) {
            throw err;
        }
    }
}

export class ManagedPublisher<T> implements Publisher<T> {

    private onDataHandler: Handler<T> = null;
    private onErrorHandler: Handler<grpc.Error> = null;
    private onFinally: Handler<void> = null;

    emitData(data: T) {
        try {
            if (this.onDataHandler) {
                this.onDataHandler(data);
            }
        } catch (e) {
            this.emitJsError(e);
        }
    }

    emitError(err: grpc.Error) {
        try {
            if (this.onErrorHandler) {
                this.onErrorHandler(err);
            }
        } catch (e) {
            if (err.code !== -1) {
                this.emitJsError(e);
            }
        }
    }

    emitJsError(err: Error) {
        this.emitError({code: -1, message: err.message})
    }

    emitClosed() {
        try {
            if (this.onFinally) {
                this.onFinally();
            }
        } catch (e) {}
    }

    cancel() {
    }

    finally(handler: Handler<void>): Publisher<T> {
        this.onFinally = linkedHandler(this.onFinally, handler);
        return this;
    }

    onData(handler: Handler<T>): Publisher<T> {
        this.onDataHandler = linkedHandler(this.onDataHandler, handler);
        return this;
    }

    onError(handler: Handler<grpc.Error>): Publisher<T> {
        this.onErrorHandler = linkedHandler(this.onErrorHandler, handler);
        return this;
    }

}

export class MappingPublisher<I, O> implements Publisher<O> {

    private reader: Publisher<I>;
    private onDataHandler: Handler<O> = null;
    private onErrorHandler: Handler<grpc.Error> = null;
    private onFinally: () => void = null;

    constructor(reader: Publisher<I>, mapper: DataMapper<I, O>) {
        this.reader = reader;
        reader.onData((data: I) => {
            const value = mapper(data);
            if (this.onDataHandler) {
                this.onDataHandler(value);
            }
        }).onError((err) => {
            if (this.onErrorHandler) {
                this.onErrorHandler(err);
            }
        }).finally(() => {
            if (this.onFinally) {
                this.onFinally();
            }
        });
    }

    cancel() {
        if (this.reader) {
            this.reader.cancel();
        }
    }

    onData(handler: Handler<O>): Publisher<O> {
        this.onDataHandler = handler;
        return this;
    }

    onError(handler: Handler<grpc.Error>): Publisher<O> {
        this.onErrorHandler = handler;
        return this;
    }

    finally(handler: () => void): Publisher<O> {
        this.onFinally = handler;
        return this;
    }
}
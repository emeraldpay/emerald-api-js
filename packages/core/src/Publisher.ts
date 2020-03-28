import * as grpc from "./grpcReimports";

/**
 * Interface for data produced by a call
 */
export interface Publisher<T> {
    /**
     * Cancel call
     */
    cancel()

    /**
     * Handler for incoming data
     * @param handler
     */
    onData(handler: Handler<T>): Publisher<T>

    /**
     * Handler for errors
     * @param handler
     */
    onError(handler: Handler<grpc.Error>): Publisher<T>

    /**
     * Handler for call end
     * @param handler
     */
    finally(handler: () => void): Publisher<T>
}

/**
 * Data conversion from one type to another
 */
export type DataMapper<I, O> = (data: I) => O;

/**
 * Handler for data
 */
export type Handler<T> = (value: T) => void;

/**
 * Join two handlers as one. Each of them will be called.
 *
 * @param current
 * @param additional
 */
function consHandlers<T>(current: Handler<T>, additional: Handler<T>): Handler<T> {
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

/**
 * Publisher with methods to emit events.
 */
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
        this.onFinally = consHandlers(this.onFinally, handler);
        return this;
    }

    onData(handler: Handler<T>): Publisher<T> {
        this.onDataHandler = consHandlers(this.onDataHandler, handler);
        return this;
    }

    onError(handler: Handler<grpc.Error>): Publisher<T> {
        this.onErrorHandler = consHandlers(this.onErrorHandler, handler);
        return this;
    }

}

/**
 * Publisher that converts incoming data to another type
 */
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

export function publishListToPromise<T>(publisher: Publisher<T>): Promise<Array<T>> {
    let closed = false;
    let result: Array<T> = [];
    return new Promise((resolve, reject) => {
        publisher.onData((data) => {
            if (closed) return;
            result.push(data);
        });
        publisher.onError((err) => {
            if (closed) return;
            closed = true;
            reject(err);
        });
        publisher.finally(() => {
            if (closed) return;
            closed = true;
            resolve(result);
        })
    })
}
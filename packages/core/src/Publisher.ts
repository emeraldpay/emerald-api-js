import * as grpc from "./grpcReimports";

type EmitItem = EmitItemData | EmitItemError | EmitItemClosed;

interface EmitItemData {
    type: "data",
    value: any
}

interface EmitItemError {
    type: "error",
    value: AnyError
}

interface EmitItemClosed {
    type: "closed"
}

export type AnyError = Error | grpc.Error;


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
    onError(handler: Handler<AnyError>): Publisher<T>

    /**
     * Handler for call end
     * @param handler
     */
    finally(handler: Handler<void>): Publisher<T>
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
function consHandlers<T>(current: Handler<T> | undefined, additional: Handler<T> | undefined): Handler<T> {
    if (current == null || typeof current == "undefined") {
        return additional;
    }
    if (additional == null || typeof additional == "undefined") {
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
 * Publisher that may keep actual events in buffer, until a handler added to process. I.e. for case when request received
 * data before onData(..) was called. Otherwise the call may miss data, or errors.
 */
export class BufferedPublisher<T> implements Publisher<T> {
    private buffer: EmitItem[] = [];
    private cancelled = false;

    private onDataHandler: Handler<T> = undefined;
    private onErrorHandler: Handler<AnyError> = undefined;
    private onFinally: Handler<void> = undefined;

    emitData(data: T) {
        if (!this.cancelled) {
            this.buffer.push({type: "data", value: data});
        }
        this.execute();
    }

    emitError(err: AnyError) {
        if (!this.cancelled) {
            this.buffer.push({type: "error", value: err});
        }
        this.execute();
    }

    emitClosed() {
        if (!this.cancelled) {
            this.buffer.push({type: "closed"});
        }
        this.execute();
    }

    execute(repeat: boolean = false) {
        const left: EmitItem[] = [];
        let internalError = false;
        let self = this;
        this.buffer.forEach((item) => {
            if (item.type == "data" && typeof this.onDataHandler != "undefined") {
                try {
                    this.onDataHandler(item.value);
                } catch (e) {
                    left.push(item);
                    internalError = true;
                }
            } else if (item.type == "error" && typeof this.onErrorHandler != "undefined") {
                try {
                    this.onErrorHandler(item.value);
                } catch (e) {
                    left.push(item);
                    internalError = true;
                }
            } else if (item.type == "closed" && typeof this.onFinally != "undefined") {
                try {
                    self.onFinally();
                } catch (e) {
                    left.push({type: "error", value: e});
                    left.push(item);
                    internalError = true;
                }
            } else {
                left.push(item);
            }
        });
        this.buffer = left;
        if (internalError && !repeat) {
            this.execute(true);
        }
    }

    cancel() {
        this.cancelled = true;
    }

    finally(handler: Handler<void>): Publisher<T> {
        this.onFinally = consHandlers(this.onFinally, handler);
        this.execute();
        return this;
    }

    onData(handler: Handler<T>): Publisher<T> {
        this.onDataHandler = consHandlers(this.onDataHandler, handler);
        this.execute();
        return this;
    }

    onError(handler: Handler<AnyError>): Publisher<T> {
        this.onErrorHandler = consHandlers(this.onErrorHandler, handler);
        this.execute();
        return this;
    }

}

/**
 * Publisher with methods to emit events.
 */
export class ManagedPublisher<T> implements Publisher<T> {

    private readonly buffer: BufferedPublisher<T>

    constructor() {
        this.buffer = new BufferedPublisher<T>()
    }

    emitData(data: T) {
        this.buffer.emitData(data);
    }

    emitError(err: AnyError) {
        this.buffer.emitError(err);
    }

    emitClosed() {
        this.buffer.emitClosed();
    }

    cancel() {
    }

    finally(handler: Handler<void>): Publisher<T> {
        this.buffer.finally(handler);
        return this;
    }

    onData(handler: Handler<T>): Publisher<T> {
        this.buffer.onData(handler);
        return this;
    }

    onError(handler: Handler<AnyError>): Publisher<T> {
        this.buffer.onError(handler);
        return this;
    }

}

/**
 * Publisher that converts incoming data to another type
 */
export class MappingPublisher<I, O> implements Publisher<O> {

    private reader: Publisher<I>;
    private readonly buffer: BufferedPublisher<O>;

    constructor(reader: Publisher<I>, mapper: DataMapper<I, O>) {
        this.buffer = new BufferedPublisher<O>();
        this.reader = reader;
        reader.onData((data: I) => {
            try {
                const value = mapper(data);
                this.buffer.emitData(value);
            } catch (e) {
                this.buffer.emitError(e);
            }
        }).onError((err) => {
            this.buffer.emitError(err);
        }).finally(() => {
            this.buffer.emitClosed();
        });
    }

    cancel() {
        this.reader?.cancel();
        this.buffer?.cancel();
    }

    onData(handler: Handler<O>): Publisher<O> {
        this.buffer.onData(handler);
        return this;
    }

    onError(handler: Handler<AnyError>): Publisher<O> {
        this.buffer.onError(handler);
        return this;
    }

    finally(handler: Handler<void>): Publisher<O> {
        this.buffer.finally(handler);
        return this;
    }
}

export class PromisePublisher<T> implements Publisher<T> {
    private value: Promise<T>;

    constructor(value: Promise<T>) {
        this.value = value;
    }

    cancel() {
    }

    onData(handler: Handler<T>): Publisher<T> {
        this.value
            .then((data) => {
                handler(data);
                return data
            })
        return this;
    }

    onError(handler: Handler<AnyError>): Publisher<T> {
        this.value.catch((err) => handler({code: err.code || -1, message: err.message}))
        return this;
    }

    finally(handler: Handler<void>): Publisher<T> {
        this.value.finally(() => handler());
        return this;
    }

}

export function publishToPromise<T>(publisher: Publisher<T>): Promise<T> {
    let closed = false;
    return new Promise((resolve, reject) => {
        publisher.onData((data) => {
            if (closed) return;
            closed = true;
            resolve(data);
        });
        publisher.onError((err) => {
            if (closed) return;
            closed = true;
            reject(err);
        });
        publisher.finally(() => {
            if (closed) return;
            closed = true;
            reject(new Error("Not executed"));
        })
    })
}

export function publishListToPromise<T>(publisher: Publisher<T>): Promise<T[]> {
    let closed = false;
    let result: T[] = [];
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
        });
    });
}
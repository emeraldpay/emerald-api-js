import * as grpc from "grpc";
import {connectivityState, ServiceError} from "grpc";
import { Readable } from "stream";

export type StreamHandler<R> = (response: ClientReadable<R>) => void;

type StreamableCall<T, R> = (req: T) => grpc.ClientReadableStream<R>;
type StandardCall<T, R> = (req: T, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: R) => void) =>  grpc.ClientUnaryCall;

export interface ClientReadable<R> extends Readable {
    cancel(): void;
}

interface MethodExecutor {
    execute(reconnect: Function);
}

class StreamExecutor<T, R> extends Readable implements ClientReadable<R>, MethodExecutor {
    private sc: ContinueCheck;
    private method: StreamableCall<T, R>;
    private request: T;

    private upstream: grpc.ClientReadableStream<R>;

    private connections = 0;

    constructor(sc: ContinueCheck, method: StreamableCall<T, R>, request: T) {
        super({objectMode: true});
        this.sc = sc;
        this.method = method;
        this.request = request;
    }

    _read(size?: number): any {
    }

    execute(reconnect: Function) {
        if (this.upstream) {
            this.upstream.cancel();
            this.upstream = undefined;
        }
        this.connections++;
        const upstream: grpc.ClientReadableStream<R> = this.method(this.request);
        upstream.on("data", (data: R) => {
            this.push(data);
        });
        upstream.on("error", (err: ServiceError) => {
            this.sc.onFail();
            if (err && (
                err.code === grpc.status.UNKNOWN
                || err.code === grpc.status.UNAVAILABLE
                || err.code === grpc.status.INTERNAL
            )) {
                console.trace(`gRPC connection to ${this.method.name} lost with code: ${err.code}. Reconnecting...`);
                setTimeout(reconnect.bind(this), 100);
            } else {
                console.error(`gRPC connection lost with code: ${err ? err.code : ''}. Closing...`);
                this.destroy(err);
            }
        });
        upstream.on("close", () => {
            this.sc.onClose();
            this.emit("close");
        });
        upstream.on("end", () => {
            this.sc.onClose();
            this.emit("end");
        });
        this.upstream = upstream;
    }

    cancel(): void {
        this.sc.onClose();
        if (this.upstream) {
            this.upstream.cancel();
        }
    }
}

class CallExecutor<T, R> implements MethodExecutor {
    private sc: ContinueCheck;
    private method: StandardCall<T, R>;
    private request: T;
    promise: Promise<R>;
    private resolve;
    private reject;

    constructor(sc: ContinueCheck, method: StandardCall<T, R>, request: T) {
        this.sc = sc;
        this.method = method;
        this.request = request;

        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        })
    }

    execute(reconnect: Function) {
        this.method(this.request, null, (err, resp) => {
            if (err) {
                this.sc.onFail();
                this.reject(err);
            } else {
                this.sc.onSuccess();
                this.resolve(resp);
            }
            this.sc.onClose();
        });
    }
}

export enum ConnectionStatus {
    PENDING,
    CONNECTING,
    CONNECTED,
    ERRORED,
    CLOSED
}

export type ConnectionListener = (status: ConnectionStatus) => void;

export class CallRetry {
    private client: grpc.Client;
    private status: ConnectionStatus = ConnectionStatus.PENDING;
    private statusListener?: ConnectionListener;
    private started = false;

    constructor(client: grpc.Client) {
        this.client = client;
        this.started = true;
    }

    public retryAlways<T, R>(method: StreamableCall<T, R>, request: T, onConnect: StreamHandler<R>) {
        const alwaysRepeat = new AlwaysRepeat();
        const processor = new StreamExecutor(alwaysRepeat, method.bind(this.client), request);
        processor.addListener("data", () => {
            this.notify(ConnectionStatus.CONNECTED);
        });
        processor.addListener("error", () => {
            this.notify(ConnectionStatus.ERRORED);
        });
        onConnect(processor);
        this.callWhenReady(processor, alwaysRepeat);
    }

    public callOnceReady<T, R>(method: StandardCall<T, R>, request: T): Promise<R> {
        const onceSuccess = new OnceSuccess();
        const processor = new CallExecutor(onceSuccess, method.bind(this.client), request);
        return new Promise((resolve, reject) => {
            this.callWhenReady(processor, onceSuccess);
            processor.promise.then((value: R) => {
                resolve(value);
                this.notify(ConnectionStatus.CONNECTED);
            }).catch((err) => {
                reject(err);
                this.notify(ConnectionStatus.ERRORED);
            });
        })
    }

    public callWhenReady<T, R>(executor: MethodExecutor, sc: ContinueCheck) {
        if (!sc.shouldContinue()) {
            this.notify(ConnectionStatus.CLOSED);
            return;
        }
        this.notify(ConnectionStatus.CONNECTING);
        const connState = this.client.getChannel().getConnectivityState(true);
        const isReady = (state: number, retry: boolean): boolean => {
            // console.warn("state", state);
            if (state === connectivityState.TRANSIENT_FAILURE) {
                if (retry) setTimeout(this.callWhenReady.bind(this), 5000, executor, sc);
                return false;
            } else if (state === connectivityState.READY) {
                return true;
            } else if (state === connectivityState.SHUTDOWN) {
                sc.onClose();
                return false;
            } else {
                if (retry) setTimeout(this.callWhenReady.bind(this), 250, executor, sc);
                return false;
            }
        };
        const execute = () => {
            executor.execute(() => {
                this.notify(ConnectionStatus.CONNECTING);
                setTimeout(this.callWhenReady.bind(this), 1000, executor, sc);
            });
        };
        if (isReady(connState, false)) {
            this.notify(ConnectionStatus.CONNECTED);
            execute();
        } else {
            this.notify(ConnectionStatus.CONNECTING);
            this.client.getChannel().watchConnectivityState(connState, Date.now() + 5000, (err) => {
                const connStateNew = this.client.getChannel().getConnectivityState(true);
                if (isReady(connStateNew, true)) {
                    execute()
                }
            });
        }
    }

    protected notify(status: ConnectionStatus) {
        if (status != this.status) {
            this.status = status;
        }
        if (this.statusListener) {
            this.statusListener(status);
        }
    }

    public setConnectionListener(listener: ConnectionListener) {
        this.statusListener = listener;
        listener(this.status);
    }
}

interface ContinueCheck {
    shouldContinue(): Boolean;
    onSuccess();
    onFail();
    onClose();
}

class AlwaysRepeat implements ContinueCheck {
    closed: Boolean = false;

    onFail() {
    }

    onSuccess() {
    }

    onClose() {
        this.closed = true;
    }

    shouldContinue(): Boolean {
        return !this.closed;
    }
}

class OnceSuccess implements ContinueCheck {
    succeed: Boolean = false;
    closed: Boolean = false;

    onFail() {
    }

    onSuccess() {
        this.succeed = true;
    }

    onClose() {
        this.closed = true;
    }

    shouldContinue(): Boolean {
        return !this.succeed && !this.closed;
    }

}
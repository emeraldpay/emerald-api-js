import * as grpc from "grpc";
import {connectivityState, ServiceError} from "grpc";

type MakeRequest = () => void;
export type StreamHandler<R> = (response: grpc.ClientReadableStream<R>) => void
type StreamableCall<T, R> = (req: T) => grpc.ClientReadableStream<R>
type StandardCall<T, R> = (req: T, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: R) => void) =>  grpc.ClientUnaryCall

export class CallRetry {
    client: grpc.Client;

    constructor(client: grpc.Client) {
        this.client = client;
    }

    public retryAlways<T, R>(method: StreamableCall<T, R>, request: T, onConnect: StreamHandler<R>) {
        const alwaysRepeat = new AlwaysRepeat();
        const handler = this.makeStreamHandler(method.bind(this.client), request, onConnect, alwaysRepeat);
        this.callWhenReady(handler, alwaysRepeat);
    }

    public callOnceReady<T, R>(method: StandardCall<T, R>, request: T): Promise<R> {
        const onceSuccess = new OnceSuccess();
        return new Promise((resolve, reject) => {
            const handler = this.makeCallHandler(method.bind(this.client), request, resolve, reject, onceSuccess);
            this.callWhenReady(handler, onceSuccess);
        })
    }

    public makeStreamHandler<T, R>(method: StreamableCall<T, R>, request: T, onConnect: StreamHandler<R>, sc: ContinueCheck): MakeRequest {
        const handler = () => {
            const listener = method(request);
            listener.on('error', (err: ServiceError) => {
                sc.onFail();
                if (err && (
                    err.code === grpc.status.UNKNOWN
                    || err.code === grpc.status.UNAVAILABLE
                )) {
                    this.callWhenReady(handler, sc);
                }
            });
            onConnect(listener);
        };
        return handler;
    }

    public makeCallHandler<T, R>(method: StandardCall<T, R>, request: T,
                                 resolve: (value?: R | PromiseLike<R>) => void, reject: (reason?: any) => void,
                                 sc: ContinueCheck): MakeRequest {
        return () => {
            method(request, null, (err, resp) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(resp)
                }
            });
        };
    }

    public callWhenReady(f: MakeRequest, sc: ContinueCheck) {
        if (!sc.shouldContinue()) {
            return;
        }
        const connState = this.client.getChannel().getConnectivityState(true);
        const isReady = (state: number, retry: boolean): boolean => {
            // console.warn("state", state);
            if (state === connectivityState.SHUTDOWN || state === connectivityState.TRANSIENT_FAILURE) {
                if (retry) setTimeout(this.callWhenReady.bind(this), 5000, f, sc);
                return false;
            } else if (state === connectivityState.READY) {
                return true;
            } else {
                if (retry) setTimeout(this.callWhenReady.bind(this), 250, f, sc);
                return false;
            }
        };
        const execute = () => {
            f();
            sc.onSuccess();
        };
        if (isReady(connState, false)) {
            execute();
        } else {
            this.client.getChannel().watchConnectivityState(connState, Date.now() + 5000, (err) => {
                const connStateNew = this.client.getChannel().getConnectivityState(true);
                if (isReady(connStateNew, true)) {
                    execute()
                }
            });
        }
    }
}

interface ContinueCheck {
    shouldContinue(): Boolean;
    onSuccess();
    onFail();
}

class AlwaysRepeat implements ContinueCheck {
    onFail() {
    }

    onSuccess() {
    }

    shouldContinue(): Boolean {
        return true;
    }
}

class OnceSuccess implements ContinueCheck {
    succeed: Boolean = false;

    onFail() {
    }

    onSuccess() {
        this.succeed = true;
    }

    shouldContinue(): Boolean {
        return !this.succeed;
    }

}
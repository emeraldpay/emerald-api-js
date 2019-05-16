import {connectivityState, ServiceError} from "grpc";
import * as grpc from "grpc";

type MakeRequest = () => void;
export type Connected<R> = (response: grpc.ClientReadableStream<R>) => void
type CallMethod<T, R> = (req: T) => grpc.ClientReadableStream<R>

export class CallRetry {
    client: grpc.Client;

    constructor(client: grpc.Client) {
        this.client = client;
    }

    public retryAlways<T, R>(method: CallMethod<T, R>, request: T, onConnect: Connected<R>) {
        const handler = this.makeHandler(method.bind(this.client), request, onConnect);
        this.callWhenReady(handler);
    }

    public makeHandler<T, R>(method: CallMethod<T, R>, request: T, onConnect: Connected<R>): MakeRequest {
        const handler = () => {
            const listener = method(request);
            listener.on('error', (err: ServiceError) => {
                if (err && (
                    err.code === grpc.status.UNKNOWN
                    || err.code === grpc.status.UNAVAILABLE
                )) {
                    this.callWhenReady(handler);
                }
            });
            onConnect(listener);
        };
        return handler;
    }

    public callWhenReady(f: MakeRequest) {
        const connState = this.client.getChannel().getConnectivityState(true);
        const verifyState = (state: number, retry: boolean): boolean => {
            if (state === connectivityState.SHUTDOWN || state === connectivityState.TRANSIENT_FAILURE) {
                // console.warn("not connected", state);
                if (retry) setTimeout(this.callWhenReady.bind(this), 5000, f);
                return false;
            } else if (state === connectivityState.READY) {
                return true;
            } else {
                if (retry) setTimeout(this.callWhenReady.bind(this), 250, f);
                return false;
            }
        };
        const execute = () => {
            f();
        };
        if (verifyState(connState, false)) {
            execute()
        } else {
            this.client.getChannel().watchConnectivityState(connState, Date.now() + 5000, (err) => {
                const connStateNew = this.client.getChannel().getConnectivityState(true);
                if (verifyState(connStateNew, true)) {
                    execute()
                }
            });
        }
    }
}
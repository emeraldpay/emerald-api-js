import * as grpc from './grpcReimports';
import {Publisher, ManagedPublisher} from './Publisher';
import {ContinueCheck} from "./Retry";

export type RemoteCall<T, R> = (req: T) => Publisher<R>;

export interface MethodExecutor {
    execute(reconnect: () => void): void;
    cancel(): void;
    terminate(): void;
}

type Logger = (msg: string) => void;

const NoLogger: Logger = (msg => {});
const ConsoleLogger: Logger = console.log;

export class StandardExecutor<T, R> extends ManagedPublisher<R> implements MethodExecutor {
    private sc: ContinueCheck;
    private method: RemoteCall<T, R>;
    private request: T;
    private log: Logger = NoLogger;

    private upstream: Publisher<R>;

    private connections = 0;

    constructor(sc: ContinueCheck, method: RemoteCall<T, R>, request: T) {
        super();
        if (typeof sc == 'undefined') {
            throw new Error('sc is not provided to StandardExecutor');
        }
        if (typeof method == 'undefined') {
            throw new Error("method is not provided to StandardExecutor");
        }
        if (typeof request == 'undefined') {
            throw new Error("request is not provided to StandardExecutor");
        }
        this.sc = sc;
        this.method = method;
        this.request = request;
    }

    setLogger(log: Logger) {
        this.log = log;
    }

    _read(size?: number): any {
    }

    execute(reconnect: () => void) {
        if (this.upstream) {
            this.upstream.cancel();
            this.upstream = undefined;
        }
        let callId = this.connections++;
        const upstream: Publisher<R> = this.method(this.request);
        upstream.onData((data: R) => {
            this.log(`gRPC request ${callId} data`);
            this.emitData(data)
        });
        upstream.onError((e) => {
            this.sc.onFail();
            // @ts-ignore
            if (e && typeof e.code == "number") {
                let err = e as grpc.Error;
                if (err.code === grpc.status.UNKNOWN
                    || err.code === grpc.status.UNAVAILABLE
                    || err.code === grpc.status.INTERNAL) {
                    this.log(`gRPC connection for ${callId} lost with code: ${err.code}. ${err.message}. Reconnecting...`);
                    setTimeout(reconnect.bind(this), 100);
                } else {
                    this.log(`gRPC connection for ${callId} lost with code: ${err ? err.code : ''}. Closing...`);
                    this.cancel();
                    this.emitError(err);
                }
            } else {
                this.log(`gRPC client error ${e ? e.message : 'UNKNOWN'}. Closing...`)
                this.cancel();
                this.emitError(e);
            }
        });
        upstream.finally(() => {
            this.log(`gRPC request ${callId} closed`);
            this.sc.onClose();
            this.emitClosed()
        });
        this.upstream = upstream;
    }

    cancel(): void {
        this.sc.onClose();
        if (this.upstream) {
            this.upstream.cancel();
        }
    }

    terminate(): void {
        this.cancel();
        this.emitError(new Error('execution terminated'));
    }
}

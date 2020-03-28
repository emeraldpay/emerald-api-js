import {MethodExecutor} from "./Executor";
import {ConnectionListener, ConnectionStatus, ConnectivityState, Channel} from "./Channel";

export class Retry<T, R> {

    private status: ConnectionStatus = ConnectionStatus.PENDING;
    private statusListener?: ConnectionListener;

    private readonly channel: Channel;
    private readonly executor: MethodExecutor;
    private readonly sc: ContinueCheck;

    constructor(channel: Channel, executor: MethodExecutor, sc: ContinueCheck) {
        if (typeof channel == 'undefined') {
            throw Error("channel is not provided");
        }
        if (typeof executor == 'undefined') {
            throw Error("executor is not provided");
        }
        if (typeof sc == 'undefined') {
            throw Error('sc is not provided');
        }
        this.channel = channel;
        this.executor = executor;
        this.sc = sc;
    }

    public callWhenReady() {
        if (!this.sc.shouldContinue()) {
            this.notify(ConnectionStatus.CLOSED);
            return;
        }
        this.notify(ConnectionStatus.CONNECTING);
        const connState = this.channel.getState();
        const isReady = (state: ConnectivityState, retry: boolean): boolean => {
            // console.warn("state", state);
            if (state === ConnectivityState.TRANSIENT_FAILURE) {
                if (retry) setTimeout(this.callWhenReady.bind(this), 5000, this.executor, this.sc);
                return false;
            } else if (state === ConnectivityState.READY) {
                return true;
            } else if (state === ConnectivityState.SHUTDOWN) {
                this.sc.onClose();
                return false;
            } else {
                if (retry) setTimeout(this.callWhenReady.bind(this), 250, this.executor, this.sc);
                return false;
            }
        };
        const execute = () => {
            this.executor.execute(() => {
                this.notify(ConnectionStatus.CONNECTING);
                setTimeout(this.callWhenReady.bind(this), 1000, this.executor, this.sc);
            });
        };
        if (isReady(connState, false)) {
            this.notify(ConnectionStatus.CONNECTED);
            execute();
        } else {
            this.notify(ConnectionStatus.CONNECTING);
            this.channel.watch(connState, 5000, (err, connStateNew) => {
                if (err) {
                    this.sc.onFail();
                }
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


export interface ContinueCheck {
    shouldContinue(): Boolean;
    onSuccess();
    onFail();
    onClose();
}

export class AlwaysRepeat implements ContinueCheck {
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

export class OnceSuccess implements ContinueCheck {
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
import {AlwaysRepeat, OnceSuccess, Publisher, RemoteCall, Retry, StandardExecutor} from "./index";

export enum ConnectionStatus {
    PENDING,
    CONNECTING,
    CONNECTED,
    ERRORED,
    CLOSED
}

export enum ConnectivityState {
    IDLE = 0,
    CONNECTING = 1,
    READY = 2,
    TRANSIENT_FAILURE = 3,
    SHUTDOWN = 4
}

export type ConnectionListener = (status: ConnectionStatus) => void;
export type StateListener = (err: any, state: ConnectivityState) => void;

export function asStatus(state: ConnectivityState | number): ConnectionStatus {
    if (state >= 0 && state <= 4) {
        return state
    }
    return ConnectionStatus.CLOSED
}

export interface Channel {
    getState(): ConnectivityState;

    watch(current: ConnectivityState, deadline: number, handler: StateListener);
}

export function alwaysRetry<T, R>(channel: Channel, call: RemoteCall<R, T>, req: R): Publisher<T> {
    const reconnect = new AlwaysRepeat();
    const executor = new StandardExecutor(reconnect, call, req);
    const retry = new Retry(channel, executor, reconnect);
    retry.callWhenReady();
    return executor;
}

export function readOnce<T, R>(channel: Channel, call: RemoteCall<R, T>, req: R): Publisher<T> {
    const once = new OnceSuccess();
    const executor = new StandardExecutor(once, call, req);
    const retry = new Retry(channel, executor, once);
    retry.callWhenReady();
    return executor;
}

export function asStateListener(listener: ConnectionListener): StateListener {
    return (err, state) => {
        if (state == ConnectivityState.IDLE) {
            listener(ConnectionStatus.PENDING)
        } else if (state == ConnectivityState.CONNECTING) {
            listener(ConnectionStatus.CONNECTING)
        } else if (state == ConnectivityState.READY) {
            listener(ConnectionStatus.CONNECTED)
        } else if (state == ConnectivityState.TRANSIENT_FAILURE) {
            listener(ConnectionStatus.ERRORED)
        } else if (state == ConnectivityState.SHUTDOWN) {
            listener(ConnectionStatus.CLOSED)
        } else if (err) {
            listener(ConnectionStatus.ERRORED)
        }
    }
}

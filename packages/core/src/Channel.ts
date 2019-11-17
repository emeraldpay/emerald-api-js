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
type StateListener = (err: any, state: ConnectivityState) => void;

export interface Channel {
    getState(): ConnectivityState;
    watch(current: ConnectivityState, deadline: number, handler: StateListener);
}
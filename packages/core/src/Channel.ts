import { AlwaysRepeat, Executor, OnceSuccess, Publisher, RemoteCall, Retry } from './index';

export enum ConnectionStatus {
  PENDING,
  CONNECTING,
  CONNECTED,
  ERRORED,
  CLOSED,
}

export enum ConnectivityState {
  IDLE = 0,
  CONNECTING = 1,
  READY = 2,
  TRANSIENT_FAILURE = 3,
  SHUTDOWN = 4,
}

export type ConnectionListener = (status: ConnectionStatus) => void;
export type StateListener = (error: Error | undefined, state: ConnectivityState) => void;

export function asStatus(state: ConnectivityState | number): ConnectionStatus {
  if (state >= 0 && state <= 4) {
    return state;
  }

  return ConnectionStatus.CLOSED;
}

export interface Channel {
  getState(): ConnectivityState;
  watch(current: ConnectivityState, deadline: number, handler: StateListener);
}

export function isChannel(channel: unknown): channel is Channel {
  return typeof channel === 'object' && channel != null && 'watch' in channel && typeof channel.watch === 'function';
}

export function alwaysRetry<T, R>(channel: Channel, call: RemoteCall<R, T>, request: R): Publisher<T> {
  const reconnect = new AlwaysRepeat();
  const executor = new Executor(call, reconnect, request);
  const retry = new Retry(channel, executor, reconnect);

  retry.callWhenReady();

  return executor;
}

export function readOnce<T, R>(channel: Channel, call: RemoteCall<R, T>, request: R, retries: number): Publisher<T> {
  const once = new OnceSuccess(retries);
  const executor = new Executor(call, once, request);
  const retry = new Retry(channel, executor, once);

  retry.callWhenReady();

  return executor;
}

export function asStateListener(listener: ConnectionListener): StateListener {
  return (error, state) => {
    if (state == ConnectivityState.IDLE) {
      listener(ConnectionStatus.PENDING);
    } else if (state == ConnectivityState.CONNECTING) {
      listener(ConnectionStatus.CONNECTING);
    } else if (state == ConnectivityState.READY) {
      listener(ConnectionStatus.CONNECTED);
    } else if (state == ConnectivityState.TRANSIENT_FAILURE) {
      listener(ConnectionStatus.ERRORED);
    } else if (state == ConnectivityState.SHUTDOWN) {
      listener(ConnectionStatus.CLOSED);
    } else if (error != null) {
      listener(ConnectionStatus.ERRORED);
    }
  };
}

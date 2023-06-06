import { Channel, ConnectionListener, ConnectionStatus, ConnectivityState, isChannel } from './Channel';
import { MethodExecutor, isMethodExecutor } from './Executor';

export interface ContinueCheck {
  failed?: boolean;
  shouldContinue(): boolean;
  onConnected?(): void;
  onSuccess?(): void;
  onFail?(): void;
  onClose(): void;
}

export function isContinueCheck(checker: unknown): checker is ContinueCheck {
  return (
    typeof checker === 'object' &&
    checker != null &&
    'shouldContinue' in checker &&
    typeof checker.shouldContinue === 'function'
  );
}

export class Retry {
  private status: ConnectionStatus = ConnectionStatus.PENDING;

  private statusListener: ConnectionListener | undefined;

  private readonly channel: Channel;
  private readonly checker: ContinueCheck;
  private readonly executor: MethodExecutor;

  constructor(channel: Channel, executor: MethodExecutor, checker: ContinueCheck) {
    if (channel == null || !isChannel(channel)) {
      throw new Error('Channel is not provided');
    }

    if (executor == null || !isMethodExecutor(executor)) {
      throw new Error('Executor is not provided');
    }

    if (checker == null || !isContinueCheck(checker)) {
      throw new Error('Continue checker is not provided');
    }

    this.channel = channel;
    this.checker = checker;
    this.executor = executor;
  }

  public callWhenReady(): void {
    if (!this.checker.shouldContinue()) {
      this.notify(ConnectionStatus.CLOSED);

      if (this.checker.failed === true) {
        this.executor.terminate();
      }

      return;
    }

    this.notify(ConnectionStatus.CONNECTING);

    const connection = this.channel.getState();

    const isReady = (state: ConnectivityState, retry: boolean): boolean => {
      if (state === ConnectivityState.READY) {
        this.checker.onConnected?.();

        return true;
      }

      if (state === ConnectivityState.SHUTDOWN) {
        this.checker.onClose();

        return false;
      }

      if (state === ConnectivityState.TRANSIENT_FAILURE) {
        this.checker.onFail?.();
      }

      if (retry) {
        setTimeout(this.callWhenReady.bind(this), 1000, this.executor, this.checker);
      }

      return false;
    };

    const execute = (): void =>
      this.executor.execute(() => {
        this.notify(ConnectionStatus.CONNECTING);

        setTimeout(this.callWhenReady.bind(this), 1000, this.executor, this.checker);
      });

    if (isReady(connection, false)) {
      this.notify(ConnectionStatus.CONNECTED);

      execute();
    } else {
      this.notify(ConnectionStatus.CONNECTING);

      this.channel.watch(connection, 5000, (error, state) => {
        if (error != null) {
          this.checker.onFail?.();
        }

        if (isReady(state, true)) {
          execute();
        }
      });
    }
  }

  public setConnectionListener(listener: ConnectionListener): void {
    this.statusListener = listener;

    listener(this.status);
  }

  protected notify(status: ConnectionStatus): void {
    if (status != this.status) {
      this.status = status;
    }

    this.statusListener?.(status);
  }
}

export class AlwaysRepeat implements ContinueCheck {
  closed = false;

  shouldContinue(): boolean {
    return !this.closed;
  }

  onClose(): void {
    this.closed = true;
  }
}

export class OnceSuccess implements ContinueCheck {
  readonly retries: number;

  counter = 0;

  succeed = false;
  closed = false;

  constructor(retries: number) {
    this.retries = retries;
  }

  get failed(): boolean {
    return this.counter >= this.retries;
  }

  shouldContinue(): boolean {
    return !this.failed && !this.succeed && !this.closed;
  }

  onSuccess(): void {
    this.succeed = true;
  }

  onFail(): void {
    this.counter += 1;
  }

  onClose(): void {
    this.closed = true;
  }
}

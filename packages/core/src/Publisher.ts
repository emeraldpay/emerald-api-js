import * as grpc from './typesGrpc';

type EmitItem = EmitItemData | EmitItemError | EmitItemClosed;

interface EmitItemData {
  type: 'data';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

interface EmitItemError {
  type: 'error';
  value: AnyError;
}

interface EmitItemClosed {
  type: 'closed';
}

export type AnyError = Error | grpc.Error;

/**
 * Interface for data produced by a call
 */
export interface Publisher<T> {
  /**
   * Get reconnection status
   */
  get reconnecting(): boolean;
  /**
   * Connect after error
   */
  connected(): void;
  /**
   * Reconnect when error
   */
  reconnect(): void;
  /**
   * Cancel call
   */
  cancel(): void;
  /**
   * Handler for incoming data
   * @param handler
   */
  onData(handler: Handler<T>): Publisher<T>;
  /**
   * Handler for errors
   * @param handler
   */
  onError(handler: Handler<AnyError>): Publisher<T>;
  /**
   * Handler for a call end
   * @param handler
   */
  finally(handler: Handler<void>): Publisher<T>;
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
function joinHandlers<T>(current: Handler<T> | undefined, additional: Handler<T> | undefined): Handler<T> {
  if (current == null) {
    return additional;
  }

  if (additional == null) {
    return current;
  }

  return (value: T) => {
    let error = null;

    try {
      current(value);
    } catch (exception) {
      error = exception;
    }

    try {
      additional(value);
    } catch (exception) {
      error = exception;
    }

    if (error != null) {
      throw error;
    }
  };
}

/**
 * Publisher that may keep actual events in buffer, until a handler added to process.
 * I.e., for a case when request received data before onData(..) was called.
 * Otherwise the call may miss data or errors.
 */
export class BufferedPublisher<T> implements Publisher<T> {
  private _reconnecting = false;

  private buffer: EmitItem[] = [];
  private cancelled = false;

  private onDataHandler: Handler<T> | undefined = undefined;
  private onErrorHandler: Handler<AnyError> | undefined = undefined;
  private onFinallyHandler: Handler<void> | undefined = undefined;

  get reconnecting(): boolean {
    return this._reconnecting;
  }

  connected(): void {
    this._reconnecting = false;
  }

  reconnect(): void {
    this._reconnecting = true;
  }

  cancel(): void {
    this._reconnecting = false;
    this.cancelled = true;
  }

  execute(repeat = false): void {
    const left: EmitItem[] = [];

    let internalError = false;

    this.buffer.forEach((item) => {
      if (item.type === 'data' && this.onDataHandler != null) {
        try {
          this.onDataHandler(item.value);
        } catch (exception) {
          left.push(item);

          internalError = true;
        }
      } else if (item.type === 'error' && this.onErrorHandler != null) {
        try {
          this.onErrorHandler(item.value);
        } catch (exception) {
          left.push(item);

          internalError = true;
        }
      } else if (item.type === 'closed' && this.onFinallyHandler != null) {
        try {
          this.onFinallyHandler();
        } catch (exception) {
          left.push({ type: 'error', value: exception });
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

  emitData(data: T): void {
    if (!this.cancelled) {
      this.buffer.push({ type: 'data', value: data });
    }

    this.execute();
  }

  emitError(error: AnyError): void {
    if (!this.cancelled) {
      this.buffer.push({ type: 'error', value: error });
    }

    this.execute();
  }

  emitClosed(): void {
    if (!this.cancelled) {
      this.buffer.push({ type: 'closed' });
    }

    this.execute();
  }

  onData(handler: Handler<T>): Publisher<T> {
    this.onDataHandler = joinHandlers(this.onDataHandler, handler);
    this.execute();

    return this;
  }

  onError(handler: Handler<AnyError>): Publisher<T> {
    this.onErrorHandler = joinHandlers(this.onErrorHandler, handler);
    this.execute();

    return this;
  }

  finally(handler: Handler<void>): Publisher<T> {
    this.onFinallyHandler = joinHandlers(this.onFinallyHandler, handler);
    this.execute();

    return this;
  }
}

/**
 * Publisher with methods to emit events.
 */
export class ManagedPublisher<T> implements Publisher<T> {
  private readonly buffer: BufferedPublisher<T>;

  constructor() {
    this.buffer = new BufferedPublisher<T>();
  }

  get reconnecting(): boolean {
    return this.buffer.reconnecting;
  }

  connected(): void {
    this.buffer.connected();
  }

  reconnect(): void {
    this.buffer.reconnect();
  }

  cancel(): void {
    this.buffer.cancel();
  }

  emitData(data: T): void {
    this.buffer.emitData(data);
  }

  emitError(error: AnyError): void {
    this.buffer.emitError(error);
  }

  emitClosed(): void {
    this.buffer.emitClosed();
  }

  onData(handler: Handler<T>): Publisher<T> {
    this.buffer.onData(handler);

    return this;
  }

  onError(handler: Handler<AnyError>): Publisher<T> {
    this.buffer.onError(handler);

    return this;
  }

  finally(handler: Handler<void>): Publisher<T> {
    this.buffer.finally(handler);

    return this;
  }
}

/**
 * Publisher that converts incoming data to another type
 */
export class MappingPublisher<I, O> implements Publisher<O> {
  private readonly buffer: BufferedPublisher<O>;

  private reader: Publisher<I>;

  constructor(reader: Publisher<I>, mapper: DataMapper<I, O>) {
    this.buffer = new BufferedPublisher<O>();
    this.reader = reader;

    reader
      .onData((data: I) => {
        try {
          const value = mapper(data);

          this.buffer.emitData(value);
        } catch (exception) {
          this.buffer.emitError(exception);
        }
      })
      .onError((error) => this.buffer.emitError(error))
      .finally(() => this.buffer.emitClosed());
  }

  get reconnecting(): boolean {
    return this.buffer.reconnecting;
  }

  connected(): void {
    this.buffer.connected();
  }

  reconnect(): void {
    this.buffer.reconnect();
  }

  cancel(): void {
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
  private readonly value: Promise<T>;

  constructor(value: Promise<T>) {
    this.value = value;
  }

  get reconnecting(): boolean {
    return false;
  }

  connected(): void {
    // Nothing
  }

  reconnect(): void {
    // Nothing
  }

  cancel(): void {
    // Nothing
  }

  onData(handler: Handler<T>): Publisher<T> {
    this.value.then((data) => {
      handler(data);

      return data;
    });

    return this;
  }

  onError(handler: Handler<AnyError>): Publisher<T> {
    this.value.catch((error) => handler({ code: error.code ?? -1, message: error.message }));

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
    publisher
      .onData((data) => {
        if (closed) {
          return;
        }

        closed = true;

        resolve(data);
      })
      .onError((error) => {
        if (closed) {
          return;
        }

        closed = true;

        reject(error);
      })
      .finally(() => {
        if (closed) {
          return;
        }

        closed = true;

        reject(new Error('Not executed'));
      });
  });
}

export function publishListToPromise<T>(publisher: Publisher<T>): Promise<T[]> {
  let closed = false;

  const result: T[] = [];

  return new Promise((resolve, reject) => {
    publisher
      .onData((data) => {
        if (closed) {
          return;
        }

        result.push(data);
      })
      .onError((error) => {
        if (closed) {
          return;
        }

        closed = true;

        reject(error);
      })
      .finally(() => {
        if (closed) {
          return;
        }

        closed = true;

        resolve(result);
      });
  });
}

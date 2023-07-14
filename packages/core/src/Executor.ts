import * as console from 'console';
import { ManagedPublisher, Publisher } from './Publisher';
import { ContinueCheck, isContinueCheck } from './Retry';
import * as grpc from './typesGrpc';

export type RemoteCall<T, R> = (request: T) => Publisher<R>;

export interface MethodExecutor {
  connected(): void;
  cancel(): void;
  execute(reconnect: () => void): void;
  terminate(): void;
}

export function isMethodExecutor(executor: unknown): executor is MethodExecutor {
  return (
    typeof executor === 'object' && executor != null && 'execute' in executor && typeof executor.execute === 'function'
  );
}

type Logger = typeof console | undefined;

export class Executor<T, R> extends ManagedPublisher<R> implements MethodExecutor {
  private readonly call: RemoteCall<T, R>;
  private readonly request: T;

  private connections = 0;

  private checker: ContinueCheck;
  private logger: Logger | undefined;
  private upstream: Publisher<R> | null;

  constructor(call: RemoteCall<T, R>, checker: ContinueCheck, request: T) {
    super();

    if (call == null || typeof call !== 'function') {
      throw new Error('Call is not provided');
    }

    if (checker == null || !isContinueCheck(checker)) {
      throw new Error('Continue checker is not provided');
    }

    if (request == null) {
      throw new Error('Request is not provided');
    }

    this.call = call;
    this.checker = checker;
    this.request = request;
  }

  setLogger(logger: Logger | undefined): void {
    this.logger = logger;
  }

  cancel(): void {
    this.checker.onClose();

    this.upstream?.cancel();
  }

  execute(reconnect: () => void): void {
    if (this.upstream != null) {
      this.upstream.cancel();
      this.upstream = null;
    }

    const callId = this.connections++;

    const upstream: Publisher<R> = this.call(this.request);

    upstream
      .onData((data: R) => {
        this.logger?.log(`gRPC request ${callId} data`);

        this.checker.onSuccess?.();
        this.emitData(data);
      })
      .onError((error) => {
        this.checker.onFail?.();

        if (typeof error === 'object' && 'code' in error && typeof error.code === 'number') {
          const grpcError = error as grpc.Error;

          if (
            grpcError.code === grpc.GrpcStatus.UNKNOWN ||
            grpcError.code === grpc.GrpcStatus.UNAVAILABLE ||
            grpcError.code === grpc.GrpcStatus.INTERNAL
          ) {
            this.logger?.warn(
              `gRPC connection for ${callId} lost with code ${grpcError.code}: ${grpcError.message}. Reconnecting...`,
            );

            this.reconnect();

            setTimeout(reconnect.bind(this), 100);
          } else {
            this.logger?.error(
              `gRPC connection for ${callId} lost with code ${grpcError.code}: ${grpcError.message}. Closing...`,
            );

            this.cancel();
            this.emitError(grpcError);
          }
        } else {
          this.logger?.error(`gRPC client error: ${error.message}. Closing...`);

          this.cancel();
          this.emitError(error);
        }
      })
      .finally(() => {
        if (!this.reconnecting) {
          this.logger?.log(`gRPC request ${callId} closed`);

          this.checker.onClose();
          this.emitClosed();
        }
      });

    this.upstream = upstream;
  }

  terminate(): void {
    this.cancel();
    this.emitError(new Error('Execution terminated'));
  }
}

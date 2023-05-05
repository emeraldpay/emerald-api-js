import * as console from 'console';
import { ManagedPublisher, Publisher } from './Publisher';
import { ContinueCheck } from './Retry';
import * as grpc from './typesGrpc';

export type RemoteCall<T, R> = (request: T) => Publisher<R>;

export interface MethodExecutor {
  cancel(): void;
  execute(reconnect: () => void): void;
  terminate(): void;
}

type Logger = typeof console | undefined;

export class Executor<T, R> extends ManagedPublisher<R> implements MethodExecutor {
  private readonly call: RemoteCall<T, R>;
  private readonly request: T;

  private connections = 0;

  private checker: ContinueCheck;
  private logger: Logger;
  private upstream: Publisher<R> | null;

  constructor(call: RemoteCall<T, R>, checker: ContinueCheck, request: T) {
    super();

    this.call = call;
    this.checker = checker;
    this.request = request;
  }

  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  cancel(): void {
    this.checker.onClose();

    if (this.upstream) {
      this.upstream.cancel();
    }
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

        this.emitData(data);
      })
      .onError((error) => {
        this.checker.onFail();

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

            setTimeout(reconnect.bind(this), 1000);
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
        this.logger?.log(`gRPC request ${callId} closed`);

        this.checker.onClose();
        this.emitClosed();
      });

    this.upstream = upstream;
  }

  terminate(): void {
    this.cancel();
    this.emitError(new Error('execution terminated'));
  }
}

import {
  Channel,
  ConnectionListener,
  ConnectivityState,
  DataMapper,
  ManagedPublisher,
  MappingPublisher,
  Publisher,
  RemoteCall,
  StateListener,
  asStatus,
} from '@emeraldpay/api';
import * as grpc from '@grpc/grpc-js';
import { ClientReadableStream, ClientUnaryCall } from '@grpc/grpc-js';

type SingleCallback<T> = (error: grpc.ServiceError | null, response: T) => void;

function toConnectivityState(state: grpc.connectivityState): ConnectivityState {
  switch (state) {
    case grpc.connectivityState.CONNECTING:
      return ConnectivityState.CONNECTING;
    case grpc.connectivityState.IDLE:
      return ConnectivityState.IDLE;
    case grpc.connectivityState.READY:
      return ConnectivityState.READY;
    case grpc.connectivityState.SHUTDOWN:
      return ConnectivityState.SHUTDOWN;
    case grpc.connectivityState.TRANSIENT_FAILURE:
      return ConnectivityState.TRANSIENT_FAILURE;
    default:
      throw Error(`Unsupported state: ${state}`);
  }
}

export class NativeChannel implements Channel {
  private readonly client: grpc.Client;

  private listener: NodeJS.Timeout;

  constructor(client: grpc.Client) {
    this.client = client;
  }

  getState(): ConnectivityState {
    const state = this.client.getChannel().getConnectivityState(true);

    return toConnectivityState(state);
  }

  watch(current: ConnectivityState, deadline: number, handler: StateListener): void {
    this.client.getChannel().watchConnectivityState(current.valueOf(), Date.now() + deadline, (error) => {
      const state = this.client.getChannel().getConnectivityState(true);

      handler(error, toConnectivityState(state));
    });
  }

  setListener(listener: ConnectionListener): void {
    clearInterval(this.listener);

    this.listener = setInterval(() => {
      const state = this.client.getChannel().getConnectivityState(false);

      listener(asStatus(state));
    }, 1000);
  }
}

class NativeCallPublisher<T> extends ManagedPublisher<T> implements Publisher<T> {
  handler(): SingleCallback<T> {
    return (error, data) => {
      if (error == null) {
        this.emitData(data);
      } else {
        this.emitError(error);
      }

      this.emitClosed();
    };
  }
}

class NativeStreamPublisher<T> extends ManagedPublisher<T> implements Publisher<T> {
  private readonly reader: ClientReadableStream<T>;

  constructor(reader: ClientReadableStream<T>) {
    super();

    this.reader = reader;
    this.reader
      .on('data', (data) => super.emitData(data))
      .on('error', (error) => super.emitError(error))
      .on('end', () => super.emitClosed());
  }

  cancel(): void {
    super.cancel();

    this.reader.cancel();
  }
}

export function callSingle<R, I, O>(
  delegate: (request: R, metadata: grpc.Metadata, callback: SingleCallback<I>) => ClientUnaryCall,
  mapper: DataMapper<I, O>,
): RemoteCall<R, O> {
  return (request) => {
    const source = new NativeCallPublisher();

    delegate(request, new grpc.Metadata(), source.handler());

    return new MappingPublisher(source, mapper);
  };
}

export function callStream<R, I, O>(
  delegate: (request: R) => ClientReadableStream<I>,
  mapper: DataMapper<I, O>,
): RemoteCall<R, O> {
  return (request) => {
    const source: Publisher<I> = new NativeStreamPublisher(delegate(request));

    return new MappingPublisher(source, mapper);
  };
}

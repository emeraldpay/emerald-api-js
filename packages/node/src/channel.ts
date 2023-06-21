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
import {
  Client,
  ClientReadableStream,
  ClientUnaryCall,
  connectivityState as GrpcConnectivityState,
  Metadata,
  ServiceError,
} from '@grpc/grpc-js';

type SingleCallback<T> = (error: ServiceError | null, response: T) => void;

function toConnectivityState(state: GrpcConnectivityState): ConnectivityState {
  switch (state) {
    case GrpcConnectivityState.CONNECTING:
      return ConnectivityState.CONNECTING;
    case GrpcConnectivityState.IDLE:
      return ConnectivityState.IDLE;
    case GrpcConnectivityState.READY:
      return ConnectivityState.READY;
    case GrpcConnectivityState.SHUTDOWN:
      return ConnectivityState.SHUTDOWN;
    case GrpcConnectivityState.TRANSIENT_FAILURE:
      return ConnectivityState.TRANSIENT_FAILURE;
    default:
      throw Error(`Unsupported state: ${state}`);
  }
}

export class NativeChannel implements Channel {
  private readonly client: Client;

  private listener: NodeJS.Timer;

  constructor(client: Client) {
    this.client = client;
  }

  close(): void {
    clearInterval(this.listener);

    this.client.close();
  }

  getState(): ConnectivityState {
    const state = this.client.getChannel().getConnectivityState(true);

    return toConnectivityState(state);
  }

  setListener(listener: ConnectionListener): void {
    clearInterval(this.listener);

    this.listener = setInterval(() => {
      const state = this.client.getChannel().getConnectivityState(false);

      listener(asStatus(state));
    }, 1000);
  }

  watch(current: ConnectivityState, deadline: number, handler: StateListener): void {
    this.client.getChannel().watchConnectivityState(current.valueOf(), Date.now() + deadline, (error) => {
      const state = this.client.getChannel().getConnectivityState(true);

      handler(error, toConnectivityState(state));
    });
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
  delegate: (request: R, metadata: Metadata, callback: SingleCallback<I>) => ClientUnaryCall,
  mapper: DataMapper<I, O>,
): RemoteCall<R, O> {
  return (request) => {
    const source = new NativeCallPublisher();

    delegate(request, new Metadata(), source.handler());

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

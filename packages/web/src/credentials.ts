import {ClientReadableStream, Metadata, RpcError, Status, StatusCode, StreamInterceptor, UnaryInterceptor} from 'grpc-web';
import {Signer, Headers, SecretToken, isSecretToken, StandardSigner} from "@emeraldpay/api";
import {AuthClient} from "./generated/AuthServiceClientPb";
import {
    AuthRequest as BaseAuthRequest,
    AuthResponse as BaseAuthResponse,
    CredentialsClient,
    ConvertAuth, RefreshRequest as BaseRefreshRequest
} from "@emeraldpay/api";
import {classFactory} from "./wrapped/Factory";

/**
 * Use this function to create a new CredentialsContext for the Emerald API
 * @param url
 * @param secretToken
 */
export function emeraldCredentials(url: string, secretToken: SecretToken): CredentialsContext {
    return new CredentialsContext(url, secretToken);
}

///
/// ------------- Internal implementation details -------------
///


class WebHeaders implements Headers {
    private readonly headers: Metadata;

    constructor(headers: Metadata) {
        this.headers = headers;
    }

    add(key: string, value: string): void {
        this.headers[key] = value;
    }
}

class WebAuthClient implements CredentialsClient {
    private readonly client: AuthClient;
    private readonly convert = new ConvertAuth(classFactory);

    constructor(client: AuthClient) {
        this.client = client;
    }

    authenticate(req: BaseAuthRequest): Promise<BaseAuthResponse> {
        return this.client.authenticate(this.convert.authRequest(req), null)
            .then(this.convert.authResponse)
    }
    refresh(req: BaseRefreshRequest): Promise<BaseAuthResponse> {
        return this.client.refresh(this.convert.refreshRequest(req), null)
            .then(this.convert.authResponse)
    }
}

export class CredentialsContext {

    private readonly signer: Signer;

    constructor(address: string, secretToken: string | SecretToken) {
        if (!isSecretToken(secretToken)) {
            throw new Error('Invalid secret token');
        }

        let client = new AuthClient(address);
        this.signer = new StandardSigner(new WebAuthClient(client), secretToken, []);
    }

    get options(): { [index: string]: any; } {
        return {
            'unaryInterceptors': [this.unaryInterceptor],
            'streamInterceptors': [this.streamInterceptor]
        }
    }

    private get unaryInterceptor(): UnaryInterceptor<any, any> {
        return {
            intercept: async (request, invoker) => {
                const meta = request.getMetadata();
                const auth = await this.signer.getAuth();
                auth.applyAuth(new WebHeaders(meta));
                return invoker(request);
            }
        };
    }

    private get streamInterceptor(): StreamInterceptor<any, any> {
        return {
            intercept: (request, invoker) => {
                // For a Stream Interceptor we cannot return a Promise but must return a Stream immediately.
                // But we cannot get the actual stream yet because we need the auth headers added before that.
                // In this case we use a StreamPipe, which we initialize and then populate with the actual stream once we have the auth.
                const pipe = new StreamPipe();
                const meta = request.getMetadata();
                this.signer.getAuth()
                    .then((auth) => {
                        auth.applyAuth(new WebHeaders(meta));
                        pipe.setDelegate(invoker(request));
                    })
                    .catch((err) => {
                        console.warn("Failed to get an authentication", err);
                        const details = err instanceof Error ? err.message : "no details";
                        pipe.fail(new RpcError(StatusCode.UNAUTHENTICATED, `Failed to get an authentication: ${details}`, {}));
                    });
                // return the piped stream immediately
                return pipe;
            }
        };
    }
}

type StreamEvent = "error" | "status" | "metadata" | "data" | "end";
// a listener for any of the events, the specific types are enforced by the `on` and `removeListener` overloads
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StreamListener = (...args: any[]) => void;

/**
 * A pipe to another stream which may be created only later, but all the event subscription (i.e, `on` calls)
 * can be accepted immediately, and forwarded to the actual stream once it's available.
 *
 * If the actual stream cannot be created (ex. the authentication failed) the pipe reports it through `fail`
 * to the `error` listeners, the same way as a failed gRPC call.
 *
 * Exported only for tests; not a part of the public API.
 */
export class StreamPipe<RESP> implements ClientReadableStream<RESP> {
    private delegate: ClientReadableStream<RESP> | undefined;
    private error: RpcError | undefined;
    private cancelled = false;

    private listeners: Array<[StreamEvent, StreamListener]> = [];

    setDelegate(delegate: ClientReadableStream<RESP>): void {
        if (this.cancelled) {
            // the pipe was cancelled while we were waiting for the stream, so close it right away
            delegate.cancel();
            return;
        }
        this.delegate = delegate;
        this.listeners.forEach(([eventType, callback]) => this.forward(delegate, eventType, callback));
        this.listeners = [];
    }

    /**
     * Fails the stream before it was created, i.e., notifies the `error` listeners
     */
    fail(error: RpcError): void {
        if (this.cancelled || this.delegate) {
            return;
        }
        this.error = error;
        this.listeners
            .filter(([eventType]) => eventType === "error")
            .forEach(([, callback]) => callback(error));
        this.listeners = [];
    }

    on(eventType: "error", callback: (err: RpcError) => void): ClientReadableStream<RESP>;
    on(eventType: "status", callback: (status: Status) => void): ClientReadableStream<RESP>;
    on(eventType: "metadata", callback: (status: Metadata) => void): ClientReadableStream<RESP>;
    on(eventType: "data", callback: (response: RESP) => void): ClientReadableStream<RESP>;
    on(eventType: "end", callback: () => void): ClientReadableStream<RESP>;
    on(eventType: StreamEvent, callback: StreamListener): ClientReadableStream<RESP> {
        if (this.delegate) {
            this.forward(this.delegate, eventType, callback);
        } else if (this.error) {
            // already failed, so only an error listener has anything to receive
            if (eventType === "error") {
                callback(this.error);
            }
        } else {
            this.listeners.push([eventType, callback]);
        }
        return this;
    }

    removeListener(eventType: "error", callback: (err: RpcError) => void): void;
    removeListener(eventType: "status", callback: (status: Status) => void): void;
    removeListener(eventType: "metadata", callback: (status: Metadata) => void): void;
    removeListener(eventType: "data", callback: (response: RESP) => void): void;
    removeListener(eventType: "end", callback: () => void): void;
    removeListener(eventType: StreamEvent, callback: StreamListener): void {
        if (this.delegate) {
            // same as with `on`, a specific event type is required by the overloads
            this.delegate.removeListener(eventType as "data", callback);
        } else {
            this.listeners = this.listeners.filter(([e, c]) => !(e === eventType && c === callback));
        }
    }

    cancel(): void {
        this.cancelled = true;
        this.delegate?.cancel();
    }

    private forward(delegate: ClientReadableStream<RESP>, eventType: StreamEvent, callback: StreamListener): void {
        // the delegate accepts only a specific event type through its overloads, though any of them is fine here
        // because the listener is passed for the same event type as it was registered
        delegate.on(eventType as "data", callback);
    }
}
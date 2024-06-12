import {ClientReadableStream, Metadata, StreamInterceptor, UnaryInterceptor} from 'grpc-web';
import {Signer, Headers, SecretToken, isSecretToken, StandardSigner} from "@emeraldpay/api";
import {AuthClient} from "./generated/AuthServiceClientPb";
import {
    AuthRequest as BaseAuthRequest,
    AuthResponse as BaseAuthResponse,
    BaseAuthClient,
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

class WebAuthClient implements BaseAuthClient {
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
        let intercept = async (request, invoker) => {
            let meta = request.getMetadata();
            let auth = await this.signer.getAuth();
            auth.applyAuth(new WebHeaders(meta));
            return invoker(request)
        };
        return {
            intercept: intercept.bind(this)
        };
    }

    private get streamInterceptor(): StreamInterceptor<any, any> {
        let intercept = (request, invoker) => {
            // For a Stream Interceptor we cannot return a Promise but must return a Stream immediately.
            // But we cannot get the actual stream yet because we need the auth headers added before that.
            // In this case we use a StreamPipe, which we initialize and then populate with the actual stream once we have the auth.
            let pipe = new StreamPipe();
            let meta = request.getMetadata();
            this.signer.getAuth()
                .then((auth) => {
                    auth.applyAuth(new WebHeaders(meta));
                    let original = invoker(request);
                    pipe.setDelegate(original);
                })
                .catch((err) => {
                    console.warn("Failed to get an authentication", err);
                    pipe.cancel();
                });
            // return the piped stream immediately
            return pipe
        }
        return {
            intercept: intercept.bind(this)
        };
    }
}

/**
 * A pipe to another stream which may be created only later, but all the event subscription (i.e, `on` calls)
 * can be accepted immediately, and forwarded to the actual stream once it's available.
 */
class StreamPipe<RESP> implements ClientReadableStream<RESP> {
    private delegate: ClientReadableStream<RESP> | undefined;

    private queueOn = [];
    private queueRemove = [];

    setDelegate(delegate: ClientReadableStream<RESP>) {
        this.delegate = delegate;
        this.queueOn.forEach((item) => {
            delegate.on(item[0], item[1]);
        });
        this.queueRemove.forEach((item) => {
            delegate.removeListener(item[0], item[1]);
        });
    }

    // @ts-ignore
    on (eventType: string,
        callback: any): StreamPipe<RESP> {
        if (this.delegate) {
            // @ts-ignore
            this.delegate.on(eventType, callback);
        } else {
            this.queueOn.push([eventType, callback]);
        }
        return this;
    }

    removeListener (eventType: string,
                    callback: any): void {
        if (this.delegate) {
            // @ts-ignore
            this.delegate.removeListener(eventType, callback);
        } else {
            this.queueRemove.push([eventType, callback]);
        }
    }


    cancel (): void {
        this.delegate.cancel();
    }

}
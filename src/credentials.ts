import {credentials, Metadata, ChannelCredentials} from "grpc";
import {TokenSignature} from "./signature";
import {AuthClient} from './wrapped/Auth';
import {AuthRequest, AuthResponse, TempAuth} from "./generated/auth_pb";

const packageJson = require('../package.json');

export enum AuthenticationStatus {
    AUTHENTICATING,
    AUTHENTICATED,
    ERROR
}

export type AuthenticationListener = (status: AuthenticationStatus) => void;

export class CredentialsContext {
    url: string;
    private readonly ca: Buffer;
    private readonly ssl: ChannelCredentials;
    private authentication: EmeraldAuthentication;
    private token: Promise<TokenSignature>;
    private readonly agent: string[];
    private readonly userId: string;
    private listener?: AuthenticationListener;
    private status = AuthenticationStatus.AUTHENTICATING;

    constructor(url: string, ca: string | Buffer, agent: string[], userId: string) {
        this.url = url;
        if (typeof ca == 'string') {
            this.ca = Buffer.from(ca, 'utf8')
        } else {
            this.ca = ca;
        }
        this.ssl = credentials.createSsl(this.ca);
        this.agent = agent;
        this.userId = userId;
    }

    protected getSsl(): ChannelCredentials {
        return this.ssl
    }

    protected getSigner(): Promise<TokenSignature> {
        if (!this.authentication) {
            this.authentication = new BasicUserAuth(this.url, this.getSsl());
        }
        if (!this.token) {
            this.token = this.authentication.authenticate(this.agent, this.userId);
        }
        return this.token;
    }

    public getChannelCredentials(): ChannelCredentials {
        const ssl = this.getSsl();
        const callCredentials = credentials.createFromMetadataGenerator(
            (params: { service_url: string }, callback: (error: Error | null, metadata?: Metadata) => void) => {
                this.getSigner().then((ts) => {
                    let signature = ts.next();
                    // console.log("auth", params.service_url, signature.msg, signature.signature);
                    if (!signature) {
                        this.notify(AuthenticationStatus.ERROR);
                        callback(new Error("No signature"));
                        return;
                    }
                    let meta = new Metadata();
                    meta.add("token", signature.token);
                    meta.add("nonce", signature.msg);
                    meta.add("sign", signature.signature);
                    this.notify(AuthenticationStatus.AUTHENTICATED);
                    callback(null, meta);
                }).catch((err) => {
                    this.notify(AuthenticationStatus.ERROR);
                    callback(new Error("Unable to get token"));
                })
            });
        return credentials.combineChannelCredentials(ssl, callCredentials)
    }

    public setListener(listener: AuthenticationListener) {
        this.listener = listener;
        listener(this.status);
    }

    protected notify(status: AuthenticationStatus) {
        if (this.listener && status != this.status) {
            this.listener(status);
            this.status = status;
        }
    }
}

export function emeraldCredentials(url: string, ca: string | Buffer, agent: string[], userId: string): CredentialsContext {
    return new CredentialsContext(url, ca, agent, userId);
}

interface EmeraldAuthentication {
    authenticate(agent: string[], userId: string): Promise<TokenSignature>
}

class BasicUserAuth implements EmeraldAuthentication {
    client: AuthClient;

    constructor(url: string, cred: ChannelCredentials) {
        this.client = new AuthClient(url, cred);
    }

    authenticate(agent: string[], userId: string): Promise<TokenSignature> {
        const authRequest = new AuthRequest();
        const tempAuth = new TempAuth();
        tempAuth.setId(userId);
        authRequest.setTempAuth(tempAuth);
        authRequest.setAgentDetailsList(agent);
        authRequest.addAgentDetails(`emerald-js/${packageJson.version}`);
        authRequest.setCapabilitiesList(["NONCE_HMAC_SHA256"]);
        authRequest.setScopesList(["BASIC_USER"]);
        return this.client.authenticate(authRequest).then((result: AuthResponse) => {
            if (!result.getSucceed()) {
                throw new Error(`Failed to auth ${result.getDenyCode()}: ${result.getDenyMessage()}`);
            }
            return new TokenSignature(result.getToken(), result.getSecret());
        });
    }

}
import {
    AuthRequest, AuthResponse,
    CredentialsClient,
    ConvertAuth,
    ListTokensRequest,
    ListTokensResponse,
    RefreshRequest,
    WhoIAmResponse,
    publishToPromise,
    readOnce, IssueTokenRequest, IssuedTokenResponse
} from "@emeraldpay/api";
import {callPromise, WebChannel} from "../channel";
import * as auth_rpc from '../generated/AuthServiceClientPb';
import * as auth_pb from "../generated/auth_pb";
import {classFactory} from "./Factory";
import {CredentialsContext} from "../credentials";
import {callSingle} from "@emeraldpay/api-node/lib/channel";

export class AuthClient {
    readonly client: auth_rpc.AuthClient;
    readonly channel: WebChannel;
    readonly retries: number;

    private readonly convert = new ConvertAuth(classFactory);

    constructor(hostname: string, channel: WebChannel, credentials: CredentialsContext, retries = 3) {
        this.client = new auth_rpc.AuthClient(hostname, null, credentials.options);
        this.channel = channel;
        this.retries = retries;
    }

    whoIAm(): Promise<WhoIAmResponse> {
        const mapper = this.convert.whoIAmResponse;

        const call = callPromise(this.client.whoAmI.bind(this.client), mapper);
        return publishToPromise(readOnce(this.channel, call, new auth_pb.WhoAmIRequest(), this.retries));
    }

    listTokens(req: ListTokensRequest): Promise<ListTokensResponse> {
        const request = this.convert.listTokensRequest(req);
        const mapper = this.convert.listTokensResponse;

        const call = callPromise(this.client.listTokens.bind(this.client), mapper);
        return publishToPromise(readOnce(this.channel, call, request, this.retries));
    }

    issueToken(req: IssueTokenRequest): Promise<IssuedTokenResponse> {
        const request = this.convert.issueTokenRequest(req);
        const call = callSingle(this.client.issueToken.bind(this.client), this.convert.issuedTokenResponse);
        return publishToPromise(readOnce(this.channel, call, request, this.retries));
    }

}

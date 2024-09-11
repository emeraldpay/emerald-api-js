import {
  ConnectionListener, ConvertAuth, IssuedTokenResponse, IssueTokenRequest,
  ListTokensRequest,
  ListTokensResponse,
  publishToPromise,
  readOnce,
  WhoIAmResponse
} from '@emeraldpay/api';
import { ChannelCredentials } from '@grpc/grpc-js';
import { NativeChannel, callSingle } from '../channel';
import { AuthClient as ProtoAuthClient } from '../generated/auth_grpc_pb';
import {
  AuthRequest as ProtoAuthRequest,
  AuthResponse as ProtoAuthResponse,
  RefreshRequest as ProtoRefreshRequest,
  WhoAmIRequest as ProtoWhoAmIRequest,
} from '../generated/auth_pb';
import {classFactory} from "./Factory";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: clientVersion } = require('../../package.json');

export class AuthClient {
  readonly client: ProtoAuthClient;
  readonly channel: NativeChannel;
  readonly credentials: ChannelCredentials;
  readonly retries: number;

  private readonly convert = new ConvertAuth(classFactory);

  constructor(address: string, credentials: ChannelCredentials, agents: string[], retries = 3) {
    const agent = [...agents, `emerald-client-node/${clientVersion}`].join(' ');

    this.client = new ProtoAuthClient(address, credentials, { 'grpc.primary_user_agent': agent });
    this.channel = new NativeChannel(this.client);
    this.credentials = credentials;
    this.retries = retries;
  }

  public setConnectionListener(listener: ConnectionListener): void {
    this.channel.setListener(listener);
  }

  public authenticate(request: ProtoAuthRequest): Promise<ProtoAuthResponse> {
    const call = callSingle(this.client.authenticate.bind(this.client), (resp: ProtoAuthResponse) => resp);
    return publishToPromise(readOnce(this.channel, call, request, this.retries));
  }

  public refresh(request: ProtoRefreshRequest): Promise<ProtoAuthResponse> {
    const call = callSingle(this.client.refresh.bind(this.client), (resp: ProtoAuthResponse) => resp);
    return publishToPromise(readOnce(this.channel, call, request, this.retries));
  }

  whoIAm(): Promise<WhoIAmResponse> {
    const call = callSingle(this.client.whoAmI.bind(this.client), this.convert.whoIAmResponse);
    return publishToPromise(readOnce(this.channel, call, new ProtoWhoAmIRequest(), this.retries));
  }

  listTokens(req: ListTokensRequest): Promise<ListTokensResponse> {
    const request = this.convert.listTokensRequest(req);
    const call = callSingle(this.client.listTokens.bind(this.client), this.convert.listTokensResponse);
    return publishToPromise(readOnce(this.channel, call, request, this.retries));
  }

  issueToken(req: IssueTokenRequest): Promise<IssuedTokenResponse> {
    const request = this.convert.issueTokenRequest(req);
    const call = callSingle(this.client.issueToken.bind(this.client), this.convert.issuedTokenResponse);
    return publishToPromise(readOnce(this.channel, call, request, this.retries));
  }

}

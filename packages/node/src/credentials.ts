import { ChannelCredentials, Metadata, credentials } from '@grpc/grpc-js';
import { AuthClient } from './wrapped/Auth';
import {
  isSecretToken,
  SecretToken,
  Signer,
  StandardSigner,
  AuthenticationListener,
  EmeraldAuthenticator
} from "@emeraldpay/api";
import {
  AuthRequest as BaseAuthRequest,
  AuthResponse as BaseAuthResponse,
  CredentialsClient,
  ConvertAuth,
  RefreshRequest as BaseRefreshRequest
} from "@emeraldpay/api";
import { classFactory } from './wrapped/Factory';
const { version: clientVersion } = require('../package.json');

/**
 * Use this function to create a new CredentialsContext for the Emerald API
 *
 * @param url
 * @param agents
 * @param secretToken
 */
export function emeraldCredentials(url: string, agents: string[], secretToken: SecretToken): CredentialsContext {
  return new CredentialsContext(url, agents, secretToken);
}

///
/// ------------- Internal implementation details -------------
///

class NodeAuthClient implements CredentialsClient {
  private readonly client: AuthClient;
  private readonly convert = new ConvertAuth(classFactory);

  constructor(client: AuthClient) {
      this.client = client;
  }

  authenticate(req: BaseAuthRequest): Promise<BaseAuthResponse> {
    return this.client.authenticate(this.convert.authRequest(req))
        .then(this.convert.authResponse)
  }
  refresh(req: BaseRefreshRequest): Promise<BaseAuthResponse> {
    return this.client.refresh(this.convert.refreshRequest(req))
        .then(this.convert.authResponse)
  }
}

export class CredentialsContext {
  private readonly agents: string[];
  private readonly channelCredentials: ChannelCredentials;
  private readonly ssl: ChannelCredentials;
  private readonly secretToken: SecretToken;

  private signer: Signer;
  readonly address: string;

  constructor(address: string, agents: string[], secretToken: string | SecretToken) {
    this.address = address;
    this.agents = [...agents, `emerald-client-node/${clientVersion}`];

    if (!isSecretToken(secretToken)) {
        throw new Error('Invalid secret token');
    }
    this.secretToken = secretToken;

    this.ssl = credentials.createSsl();

    let authClient = new AuthClient(this.address, this.ssl, this.agents)
    this.signer = new StandardSigner(new NodeAuthClient(authClient), this.secretToken, this.agents)

    const ssl = this.getSsl();

    const callCredentials = credentials.createFromMetadataGenerator(
      (params: { service_url: string }, callback: (error: Error | null, metadata?: Metadata) => void) =>
        this.signer.getAuth()
          .then((auth) => {
            const meta = new Metadata();
            try {
              auth.applyAuth(meta);
            } catch (exception) {
              callback(exception);
              return;
            }
            callback(null, meta);
          })
          .catch(() => {
            callback(new Error('Unable to get token'));
          }),
    );

    this.channelCredentials = credentials.combineChannelCredentials(ssl, callCredentials);
  }

  getChannelCredentials(): ChannelCredentials {
    return this.channelCredentials;
  }

  setAuthentication(authentication: EmeraldAuthenticator): void {
    this.signer.setAuthentication(authentication);
  }

  setListener(listener: AuthenticationListener): void {
    this.signer.setListener(listener);
  }

  protected getSsl(): ChannelCredentials {
    return this.ssl;
  }
}


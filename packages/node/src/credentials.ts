import { ChannelCredentials, Metadata, credentials } from '@grpc/grpc-js';
import { AuthRequest, AuthResponse, RefreshRequest } from './generated/auth_pb';
import { AuthMetadata, JwtSignature } from './signature';
import { AuthClient } from './wrapped/Auth';
import { isSecretToken, RefreshToken, SecretToken} from "@emeraldpay/api";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: clientVersion } = require('../package.json');

export enum AuthenticationStatus {
  AUTHENTICATING,
  AUTHENTICATED,
  ERROR,
}

export enum TokenStatus {
  REQUIRED,
  REQUESTED,
  SUCCESS,
  ERROR,
}

export type AuthenticationListener = (status: AuthenticationStatus, tokenStatus: TokenStatus) => void;

export class CredentialsContext {
  private readonly agents: string[];
  private readonly channelCredentials: ChannelCredentials;
  private readonly ssl: ChannelCredentials;
  private readonly secretToken: SecretToken;

  private authenticationStatus = AuthenticationStatus.AUTHENTICATING;
  private tokenStatus = TokenStatus.REQUIRED;

  private authentication: EmeraldAuthentication | undefined;
  private listener: AuthenticationListener | undefined;
  private token: AuthMetadata | undefined;

  readonly address: string;

  constructor(address: string, agents: string[], secretToken: string | SecretToken) {
    this.address = address;
    this.agents = agents;

    if (!isSecretToken(secretToken)) {
        throw new Error('Invalid secret token');
    }
    this.secretToken = secretToken;

    this.ssl = credentials.createSsl();

    const ssl = this.getSsl();

    const callCredentials = credentials.createFromMetadataGenerator(
      (params: { service_url: string }, callback: (error: Error | null, metadata?: Metadata) => void) =>
        this.getSigner()
          .then((auth) => {
            const meta = new Metadata();

            try {
              auth.add(meta);
            } catch (exception) {
              this.notify(AuthenticationStatus.ERROR);

              callback(exception);

              return;
            }

            this.notify(AuthenticationStatus.AUTHENTICATED);

            callback(null, meta);
          })
          .catch(() => {
            this.notify(AuthenticationStatus.ERROR);

            callback(new Error('Unable to get token'));
          }),
    );

    this.channelCredentials = credentials.combineChannelCredentials(ssl, callCredentials);
  }

  getChannelCredentials(): ChannelCredentials {
    return this.channelCredentials;
  }

  setAuthentication(authentication: EmeraldAuthentication): void {
    this.authentication = authentication;
  }

  setListener(listener: AuthenticationListener): void {
    this.listener = listener;

    listener(this.authenticationStatus, this.tokenStatus);
  }

  protected getSigner(): Promise<AuthMetadata> {
    if (this.tokenStatus === TokenStatus.REQUESTED) {
      return new Promise((resolve, reject) => {
        const awaitToken = (): void => {
          switch (this.tokenStatus) {
            case TokenStatus.ERROR:
              return reject();
            case TokenStatus.SUCCESS:
              return resolve(this.token);
            default:
              setTimeout(awaitToken, 50);
          }
        };

        awaitToken();
      });
    }

    if (this.authentication == null) {
      this.authentication = new JwtUserAuth(this.address, this.getSsl(), this.secretToken, this.agents);
    }

    if (this.token == null) {
      this.tokenStatus = TokenStatus.REQUESTED;
      this.notify(AuthenticationStatus.AUTHENTICATING);

      return this.authentication
        .authenticate()
        .then((token) => {
          this.token = token;
          this.tokenStatus = TokenStatus.SUCCESS;

          return token;
        })
        .catch((error) => {
          console.warn("Failed to authenticate", error);
          this.tokenStatus = TokenStatus.ERROR;

          throw error;
        });
    } else if (this.token.isExpired()) {
      this.tokenStatus = TokenStatus.REQUESTED;
      this.notify(AuthenticationStatus.AUTHENTICATING);

      return this.authentication
          .refresh()
          .then((token) => {
            this.token = token;
            this.tokenStatus = TokenStatus.SUCCESS;

            return token;
          })
          .catch((error) => {
            console.warn("Failed to refresh", error);
            this.tokenStatus = TokenStatus.ERROR;

            throw error;
          });
    }

    return Promise.resolve(this.token);
  }

  protected getSsl(): ChannelCredentials {
    return this.ssl;
  }

  protected notify(status: AuthenticationStatus): void {
    if (status != this.authenticationStatus) {
      this.authenticationStatus = status;

      this.listener?.(status, this.tokenStatus);
    }
  }
}

export function emeraldCredentials(url: string, agents: string[], secretToken: SecretToken): CredentialsContext {
  return new CredentialsContext(url, agents, secretToken);
}

export interface EmeraldAuthentication {
  authenticate(): Promise<AuthMetadata>;
  refresh(): Promise<AuthMetadata>
}

class JwtUserAuth implements EmeraldAuthentication {
  private readonly client: AuthClient;
  private readonly agents: string[];
  private readonly secretToken: SecretToken;
  private refreshToken: RefreshToken | undefined;

  constructor(url: string, credentials: ChannelCredentials, secretToken: SecretToken, agents: string[]) {
    this.client = new AuthClient(url, credentials, agents);
    this.secretToken = secretToken;
    this.agents = agents;
  }

  private getAgents(): string[] {
    if (this.agents == null || this.agents.length == 0) {
      return [`emerald-client-node/${clientVersion}`]
    }
    return [...this.agents, `emerald-client-node/${clientVersion}`]
  }

  authenticate(): Promise<AuthMetadata> {
    const authRequest = new AuthRequest();
    authRequest.setAgentDetailsList(this.getAgents());
    authRequest.setCapabilitiesList(['JWT_RS256']);
    authRequest.setAuthSecret(this.secretToken);

    return this.client.authenticate(authRequest).then((result: AuthResponse) => {
      if (result.getStatus() !== 0) {
        throw new Error(`Failed to auth. Code=${result.getStatus()}, message=${result.getDenyMessage()}`);
      }

      if (result.getType() === 'JWT_RS256') {
        this.refreshToken = result.getRefreshToken();
        return new JwtSignature(result.getAccessToken(), new Date(result.getExpiresAt()));
      }

      throw new Error(`Unsupported auth: ${result.getType()}`);
    });
  }

  refresh(): Promise<AuthMetadata> {
    if (this.refreshToken == null) {
      return Promise.reject(new Error('No refresh token'));
    }

    const refreshRequest = new RefreshRequest();
    refreshRequest.setAuthSecret(this.secretToken);
    refreshRequest.setRefreshToken(this.refreshToken);

    return this.client.refresh(refreshRequest).then((result: AuthResponse) => {
      this.refreshToken = null;

      if (result.getStatus() !== 0) {
        throw new Error(`Failed to auth. Code=${result.getStatus()}, message=${result.getDenyMessage()}`);
      }

      if (result.getType() === 'JWT_RS256') {
        this.refreshToken = result.getRefreshToken();
        return new JwtSignature(result.getAccessToken(), new Date(result.getExpiresAt()));
      }

      throw new Error(`Unsupported auth: ${result.getType()}`);
    });
  }

}

import { ChannelCredentials, Metadata, credentials } from '@grpc/grpc-js';
import { AuthRequest, AuthResponse, TempAuth } from './generated/auth_pb';
import { AuthMetadata, JwtSignature } from './signature';
import { AuthClient } from './wrapped/Auth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: clientVersion } = require('../package.json');

export enum AuthenticationStatus {
  AUTHENTICATING,
  AUTHENTICATED,
  ERROR,
}

export type AuthenticationListener = (status: AuthenticationStatus) => void;

export class CredentialsContext {
  public url: string;

  private readonly agent: string[];
  private readonly channelCredentials: ChannelCredentials;
  private readonly ssl: ChannelCredentials;
  private readonly userId: string;

  private authentication: EmeraldAuthentication;
  private listener?: AuthenticationListener;
  private status = AuthenticationStatus.AUTHENTICATING;
  private token?: AuthMetadata;

  constructor(url: string, agent: string[], userId: string) {
    this.agent = agent;
    this.url = url;
    this.userId = userId;

    this.ssl = credentials.createSsl();

    const ssl = this.getSsl();

    const callCredentials = credentials.createFromMetadataGenerator(
      (params: { service_url: string }, callback: (error: Error | null, metadata?: Metadata) => void) => {
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
          });
      },
    );

    this.channelCredentials = credentials.combineChannelCredentials(ssl, callCredentials);
  }

  public getChannelCredentials(): ChannelCredentials {
    return this.channelCredentials;
  }

  public setListener(listener: AuthenticationListener): void {
    this.listener = listener;

    listener(this.status);
  }

  protected getSsl(): ChannelCredentials {
    return this.ssl;
  }

  protected getSigner(): Promise<AuthMetadata> {
    if (!this.authentication) {
      this.authentication = new JwtUserAuth(this.url, this.getSsl(), this.agent);
    }

    if (typeof this.token == 'undefined') {
      return this.authentication.authenticate(this.agent, this.userId).then((token) => {
        this.token = token;

        return token;
      });
    }

    return Promise.resolve(this.token);
  }

  protected notify(status: AuthenticationStatus): void {
    if (this.listener && status != this.status) {
      this.status = status;
      this.listener(status);
    }
  }
}

export function emeraldCredentials(url: string, agent: string[], userId: string): CredentialsContext {
  return new CredentialsContext(url, agent, userId);
}

interface EmeraldAuthentication {
  authenticate(agent: string[], userId: string): Promise<AuthMetadata>;
}

class JwtUserAuth implements EmeraldAuthentication {
  client: AuthClient;

  constructor(url: string, credentials: ChannelCredentials, agent: string[]) {
    this.client = new AuthClient(url, credentials, agent);
  }

  authenticate(agent: string[], userId: string): Promise<AuthMetadata> {
    const authRequest = new AuthRequest();
    const tempAuth = new TempAuth();

    tempAuth.setId(userId);

    authRequest.setTempAuth(tempAuth);
    authRequest.setAgentDetailsList([...agent, `emerald-client-node/${clientVersion}`]);
    authRequest.setCapabilitiesList(['JWT_RS256']);
    authRequest.setScopesList(['BASIC_USER']);

    return this.client.authenticate(authRequest).then((result: AuthResponse) => {
      if (!result.getSucceed()) {
        throw new Error(`Failed to auth ${result.getDenyCode()}: ${result.getDenyMessage()}`);
      }

      if (result.getType() === 'JWT_RS256') {
        return new JwtSignature(result.getToken(), new Date(result.getExpire()));
      }

      throw new Error(`Unsupported auth: ${result.getType()}`);
    });
  }
}

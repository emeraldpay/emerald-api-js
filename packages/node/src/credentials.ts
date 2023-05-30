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

enum TokenStatus {
  REQUIRED,
  REQUESTED,
  SUCCESS,
}

export type AuthenticationListener = (status: AuthenticationStatus) => void;

export class CredentialsContext {
  private readonly agents: string[];
  private readonly channelCredentials: ChannelCredentials;
  private readonly ssl: ChannelCredentials;
  private readonly userId: string;

  private authenticationStatus = AuthenticationStatus.AUTHENTICATING;
  private tokenStatus = TokenStatus.REQUIRED;

  private authentication: EmeraldAuthentication | undefined;
  private listener: AuthenticationListener | undefined;
  private token: AuthMetadata | undefined;

  readonly address: string;

  constructor(address: string, agents: string[], userId: string) {
    this.address = address;
    this.agents = agents;
    this.userId = userId;

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

  public getChannelCredentials(): ChannelCredentials {
    return this.channelCredentials;
  }

  public setListener(listener: AuthenticationListener): void {
    this.listener = listener;

    listener(this.authenticationStatus);
  }

  protected getSsl(): ChannelCredentials {
    return this.ssl;
  }

  protected getSigner(): Promise<AuthMetadata> {
    if (this.tokenStatus === TokenStatus.REQUESTED) {
      return new Promise((resolve) => {
        const awaitToken = (): void => {
          if (this.tokenStatus === TokenStatus.SUCCESS) {
            resolve(this.token);
          } else {
            setTimeout(awaitToken, 250);
          }
        };

        awaitToken();
      });
    }

    if (this.authentication == null) {
      this.authentication = new JwtUserAuth(this.address, this.getSsl(), this.agents);
    }

    if (this.token == null) {
      this.tokenStatus = TokenStatus.REQUESTED;

      return this.authentication.authenticate(this.agents, this.userId).then((token) => {
        this.tokenStatus = TokenStatus.SUCCESS;

        this.token = token;

        return token;
      });
    }

    return Promise.resolve(this.token);
  }

  protected notify(status: AuthenticationStatus): void {
    if (status != this.authenticationStatus) {
      this.authenticationStatus = status;
      this.listener?.(status);
    }
  }
}

export function emeraldCredentials(url: string, agents: string[], userId: string): CredentialsContext {
  return new CredentialsContext(url, agents, userId);
}

interface EmeraldAuthentication {
  authenticate(agents: string[], userId: string): Promise<AuthMetadata>;
}

class JwtUserAuth implements EmeraldAuthentication {
  client: AuthClient;

  constructor(url: string, credentials: ChannelCredentials, agents: string[]) {
    this.client = new AuthClient(url, credentials, agents);
  }

  authenticate(agents: string[], userId: string): Promise<AuthMetadata> {
    const authRequest = new AuthRequest();
    const tempAuth = new TempAuth();

    tempAuth.setId(userId);

    authRequest.setAgentDetailsList([...agents, `emerald-client-node/${clientVersion}`]);
    authRequest.setCapabilitiesList(['JWT_RS256']);
    authRequest.setScopesList(['BASIC_USER']);
    authRequest.setTempAuth(tempAuth);

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

import {
  CredentialsClient,
  RefreshToken,
  SecretToken,
  AuthRequest,
  AuthResponse,
  RefreshRequest,
  isAuthResponseFail, isAuthResponseOk
} from "./typesAuth";
const { version: clientVersion } = require('../package.json');

/**
 * A general interface to modify request headers
 */
export interface Headers {
  /**
   * Add a header to the request
   *
   * @param key header name (ex `Authorization`)
   * @param value header value (ex `Bearer <token>`)
   */
  add(key: string, value: string): void;
}

/**
 * Current authentication details
 */
export interface AuthDetails {
  /**
   * Add the authentication details to the request headers
   * @param meta
   */
  applyAuth(meta: Headers): void;

  /**
   * Check if it's expired and needs to be refreshed from server before applying
   */
  isExpired(): boolean;
}

/**
 * No authentication, just pass the requests as is
 */
export class NoAuth implements AuthDetails {
  applyAuth(_meta: Headers): void {
      // do nothing
  }

  isExpired(): boolean {
      return false;
  }
}

/**
 * Interface to an authentication provider. This provider get an actual auth details, such as JWT, from the server.
 */
export interface EmeraldAuthenticator {
  authenticate(): Promise<AuthDetails>;
  refresh(): Promise<AuthDetails>
}

export type AuthenticationListener = (status: AuthenticationStatus, tokenStatus: TokenStatus) => void;
export enum AuthenticationStatus {
  AUTHENTICATING,
  AUTHENTICATED,
  ERROR,
}

/**
 * JWT based authentication
 */
export class JwtSignature implements AuthDetails {
  token: string;
  expire: Date;

  constructor(token: string, expire: Date) {
    this.token = token;
    this.expire = expire;
  }

  applyAuth(meta: Headers): void {
    meta.add('Authorization', `Bearer ${this.token}`);
  }

  public update(token: string, expire: Date): void {
    this.token = token;
    this.expire = expire;
  }

  isExpired(): boolean {
    return new Date() >= this.expire;
  }

}

export enum TokenStatus {
  REQUIRED,
  REQUESTED,
  SUCCESS,
  ERROR,
}

/**
 * Interface to access the current auth provide per API client
 */
export interface Signer {
  /**
   * Get current authentication details
   */
  getAuth(): Promise<AuthDetails>;

  /**
   * Listen for authentication status changes
   *
   * @param listener
   */
  setListener(listener: AuthenticationListener): void;

  /**
   * Set a new authentication provider.
   * Usually, it's created automatically by the signer, as it knows what kind of provider it needs.
   *
   * @param provider
   */
  setAuthentication(provider: EmeraldAuthenticator): void;
}

export class NoSigner implements Signer {
  getAuth(): Promise<AuthDetails> {
    return Promise.reject(new Error('No signer'));
  }
  setListener(listener: AuthenticationListener): void {
    listener(AuthenticationStatus.AUTHENTICATED, TokenStatus.SUCCESS);
  }
  setAuthentication(_authentication: EmeraldAuthenticator): void {
    // do nothing
  }
}

/**
 * Standard signer based on JWT authentication provider (initiated automatically)
 *
 * @see JwtAuthProvider
 */
export class StandardSigner implements Signer {
  private readonly client: CredentialsClient;
  private readonly secretToken: SecretToken;
  private readonly agents: string[];

  private tokenStatus = TokenStatus.REQUIRED;
  private token: AuthDetails | undefined;
  private provider: EmeraldAuthenticator | undefined;
  private listener: AuthenticationListener | undefined;
  private authenticationStatus = AuthenticationStatus.AUTHENTICATING;

  constructor(client: CredentialsClient, secretToken: SecretToken, agents: string[]) {
    this.client = client;
    this.secretToken = secretToken;
    this.agents = agents;
  }

  getAuth(): Promise<AuthDetails> {
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

    // Created a default instance
    if (this.provider == null) {
      this.provider = new JwtAuthProvider(this.client, this.secretToken, this.agents);
    }

    // No token yet -> start the authentication
    if (this.token == null) {
      this.tokenStatus = TokenStatus.REQUESTED;
      this.notify(AuthenticationStatus.AUTHENTICATING);

      return this.provider
          .authenticate()
          .then((token) => {
            this.token = token;
            this.tokenStatus = TokenStatus.SUCCESS;
            this.notify(AuthenticationStatus.AUTHENTICATED);

            return token;
          })
          .catch((error) => {
            console.warn("Failed to authenticate", error);
            this.tokenStatus = TokenStatus.ERROR;
            this.notify(AuthenticationStatus.ERROR);

            throw error;
          });

      // current token is expired -> refresh it
    } else if (this.token.isExpired()) {
      this.tokenStatus = TokenStatus.REQUESTED;
      this.notify(AuthenticationStatus.AUTHENTICATING);

      return this.provider
          .refresh()
          .then((token) => {
            this.token = token;
            this.tokenStatus = TokenStatus.SUCCESS;
            this.notify(AuthenticationStatus.AUTHENTICATED);

            return token;
          })
          .catch((error) => {
            console.warn("Failed to refresh", error);
            this.tokenStatus = TokenStatus.ERROR;
            this.notify(AuthenticationStatus.ERROR);

            throw error;
          });
    }

    // use the current token
    return Promise.resolve(this.token);
  }

  protected notify(status: AuthenticationStatus): void {
    if (status != this.authenticationStatus) {
      this.authenticationStatus = status;

      this.listener?.(status, this.tokenStatus);
    }
  }

  setListener(listener: AuthenticationListener): void {
    this.listener = listener;

    listener(this.authenticationStatus, this.tokenStatus);
  }

  setAuthentication(authentication: EmeraldAuthenticator): void {
    this.provider = authentication;
  }
}

class JwtAuthProvider implements EmeraldAuthenticator {
  private readonly client: CredentialsClient;
  private readonly agents: string[];
  private readonly secretToken: SecretToken;
  private refreshToken: RefreshToken | undefined;

  constructor(client: CredentialsClient, secretToken: SecretToken, agents: string[]) {
    this.client = client;
    this.secretToken = secretToken;
    if (this.agents == null || this.agents.length == 0) {
      this.agents = [`emerald-client/${clientVersion}`];
    } else {
      this.agents = agents;
    }
  }

  authenticate(): Promise<AuthDetails> {
    const authRequest: AuthRequest = {
      secret: this.secretToken,
      agent: this.agents,
    }

    return this.client.authenticate(authRequest).then((result: AuthResponse) => {
      if (isAuthResponseFail(result)) {
        throw new Error(`Failed to auth. Code=${result.status}, message=${result.denyMessage}`);
      }
      if (isAuthResponseOk(result)) {
        this.refreshToken = result.refreshToken;
        return new JwtSignature(result.jwt, result.expiresAt);
      }
      throw new Error(`Unsupported auth`);
    });
  }

  refresh(): Promise<AuthDetails> {
    if (this.refreshToken == null) {
      return Promise.reject(new Error('No refresh token'));
    }

    const refreshRequest: RefreshRequest = {
        refreshToken: this.refreshToken,
    }

    return this.client.refresh(refreshRequest).then((result: AuthResponse) => {
      this.refreshToken = null;
      if (isAuthResponseFail(result)) {
        throw new Error(`Failed to auth. Code=${result.status}, message=${result.denyMessage}`);
      }
      if (isAuthResponseOk(result)) {
        this.refreshToken = result.refreshToken;
        return new JwtSignature(result.jwt, result.expiresAt);
      }
      throw new Error(`Unsupported auth`);
    });
  }

}

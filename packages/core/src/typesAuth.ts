import {MessageFactory} from "./typesConvert";
import * as auth_pb from "./generated/auth_pb";
import {UUID} from "./typesCommon";

export type AuthCapability = 'JWT_RS256';

export type TokenId = UUID;
export type OrganizationId = UUID;
export type ProjectId = UUID;

/**
 * A token to authenticate with API. Format: emrld_ + 38 random alphanumeric characters.
 * When it's a one-time auth token, it starts with "emrld_temp_"
 */
export type SecretToken = string;

const SecretTokenRegex = new RegExp('^emrld_(temp_)?[0-9a-zA-Z]{38}$');

export function isSecretToken(token: string): token is SecretToken {
  return SecretTokenRegex.test(token);
}

export type RefreshToken = string;
const RefreshTokenRegex = new RegExp('^emrld_refresh_[0-9a-zA-Z]{38}$');

export function isRefreshToken(token: string): token is RefreshToken {
  return RefreshTokenRegex.test(token);
}

export type AuthRequest = {
  agent: string[],
  secret: SecretToken,
}

export type RefreshRequest = {
  secret: SecretToken,
  refreshToken: RefreshToken,
}

export type AuthResponseOk = {
  status: number,
  jwt: string,
  expiresAt: Date,
  refreshToken: RefreshToken,
}
export type AuthResponseFail = {
  status: number,
  denyMessage: string,
}
export type AuthResponse = AuthResponseOk | AuthResponseFail;

export function isAuthResponseOk(res: AuthResponse): res is AuthResponseOk {
  return res.status == 0 && (res as AuthResponseOk).jwt !== undefined;
}
export function isAuthResponseFail(res: AuthResponse): res is AuthResponseFail {
  return res.status != 0;
}

export type IAmAuthenticated = {
  authenticated: true,
  tokenId: TokenId,
}

export type IAMUnauthenticated = {
  authenticated: false,
}

export type WhoIAmResponse = IAmAuthenticated | IAMUnauthenticated;

export type ListTokensRequest = {
  organizationId: OrganizationId,
  projectId?: ProjectId,
}

export type ListTokensResponse = {
  tokens: TokenDetails[],
}

export type TokenDetails = {
  organizationId: OrganizationId,
  projectId: ProjectId,
  tokenId: TokenId,
  createdAt: Date,
}

export type IssueTokenRequest = {
  /**
   * Type of the token to issue
   * - "temp" - one-time token
   */
  type: "temp",

  /**
   * The scopes to be used for the token. Cannot be larger that the current authenticated scopes.
   */
  scopes?: string[],

  /**
   * The user id associated with the token, i.e. who will use the token.
   * There are restrictions who can set this. In short the token issuer must be in control of the user / impersonate the user.
   */
  userId?: string,

  /**
   * A timestamp when it expires.
   * For a temp one-time token, by default, it's 1 Day and cannot be more than 30 days.
   */
  expireAt?: Date,
}

export type IssuedTokenResponse = {
  /**
   * The issued token
   */
  secret: SecretToken,

  /**
   * When the token expires
   */
  expiresAt: Date,
}

export class ConvertAuth {
  private readonly factory: MessageFactory;

  constructor(factory: MessageFactory) {
    this.factory = factory;
  }

  public authRequest(req: AuthRequest): auth_pb.AuthRequest {
    const result: auth_pb.AuthRequest = this.factory('auth_pb.AuthRequest');

    result.setAgentDetailsList(req.agent);
    result.setCapabilitiesList(['JWT_RS256']);
    result.setAuthSecret(req.secret);

    return result;
  }

  public refreshRequest(req: RefreshRequest): auth_pb.RefreshRequest {
    const result: auth_pb.RefreshRequest = this.factory('auth_pb.RefreshRequest');

    result.setAuthSecret(req.secret);
    result.setRefreshToken(req.refreshToken);

    return result;
  }

  public authResponse(res: auth_pb.AuthResponse): AuthResponse {
    if (res.getStatus() !== 0) {
      return {
        status: res.getStatus(),
        denyMessage: res.getDenyMessage(),
      }
    } else {
      return {
        status: res.getStatus(),
        jwt: res.getAccessToken(),
        expiresAt: new Date(res.getExpiresAt()),
        refreshToken: res.getRefreshToken(),
      }
    }
  }

  public whoIAmResponse(res: auth_pb.WhoAmIResponse): WhoIAmResponse {
    if (res.getIsAuthenticated()) {
      return {
        authenticated: true,
        tokenId: res.getTokenId(),
      }
    } else {
      return {
        authenticated: false,
      }
    }
  }

  public listTokensRequest(req: ListTokensRequest): auth_pb.ListTokensRequest {
    const result: auth_pb.ListTokensRequest = this.factory('auth_pb.ListTokensRequest');

    result.setOrganizationId(req.organizationId);
    if (req.projectId) {
      result.setProjectId(req.projectId);
    }

    return result;
  }

  public listTokensResponse(res: auth_pb.ListTokensResponse): ListTokensResponse {
    return {
      tokens: res.getTokensList().map((token) => {
        return {
          organizationId: token.getOrganizationId(),
          projectId: token.getProjectId(),
          tokenId: token.getTokenId(),
          createdAt: new Date(token.getCreationDate()),
        }
      }),
    }
  }

  public issueTokenRequest(req: IssueTokenRequest): auth_pb.IssueTokenRequest {
    const result: auth_pb.IssueTokenRequest = this.factory('auth_pb.IssueTokenRequest');
    if (req.type == "temp") {
        result.setType(auth_pb.IssueTokenRequest.TokenType.TEMP);
    }
    if (req.scopes) {
        result.setScopesList(req.scopes);
    }
    if (req.userId) {
        result.setUserId(req.userId);
    }
    if (req.expireAt) {
        result.setExpireAt(req.expireAt.getTime());
    }
    return result;
  }

  public issuedTokenResponse(res: auth_pb.IssuedTokenResponse): IssuedTokenResponse {
    return {
      secret: res.getAuthSecret(),

      // when backed returns 0, it means "never expires" (though it almost always has some actual date).
      // Let's set 10 years from now here, to avoid unnecessary null checks
      expiresAt: res.getExpiresAt() > 0 ? new Date(res.getExpiresAt()) : new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
    }
  }
}

/**
 * A subset of the Auth API used to get credentials
 */
export interface CredentialsClient {
  authenticate(req: AuthRequest): Promise<AuthResponse>;
  refresh(req: RefreshRequest): Promise<AuthResponse>;
}
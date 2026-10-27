import * as auth_pb from "./generated/auth_pb";
import {UUID} from "./typesCommon";
import {MessageFactory} from "./typesConvert";

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
  description?: string,
}

export type IssueTokenRequest = {
  /**
   * Type of the token to issue
   * - "temp" - one-time token
   * - "permanent" - long-live token that can be used multiple times
   */
  type: "temp" | "permanent",

  /**
   * The scopes to be used for the token. Cannot be larger that the current authenticated scopes.
   */
  scopes?: string[],

  /**
   * A timestamp when it expires.
   * For a temp one-time token, by default, it's 1 Day and cannot be more than 30 days.
   */
  expireAt?: Date,

  /**
   * (for a permanent token) organization id for the token
   */
  organizationId?: OrganizationId,

  /**
   * (for a permanent token) project id for the token
   */
  projectId?: ProjectId,

  /**
   * (for a permanent token) description of the token
   */
  description?: string,

  /**
   * Host names allowed to use the token from a web browser. When set, they are checked against the Referer header.
   * Note that this doesn't prevent using the token outside a browser, where the header can easily be forged.
   * Any origin is allowed when not set or empty.
   */
  requiredOrigins?: string[],

  /**
   * IP addresses allowed to use the token, in IPv4 or CIDR notation (ex. `192.168.1.10` or `10.0.0.0/8`).
   * Any address is allowed when not set or empty.
   */
  requiredIps?: string[],
}

export type IssuedTokenResponse = {
  /**
   * Id of the issued token
   */
  tokenId: TokenId,

  /**
   * The issued token
   */
  secret: SecretToken,

  /**
   * When the token expires
   */
  expiresAt: Date,
}

/**
 * Update details of an existing permanent token.
 *
 * Only the fields that are set (i.e., not `undefined`) are updated, all other fields keep their current values.
 * To erase a stored value set it to `null` (an empty value, like `[]` or `""`, erases it as well).
 * At least one field to update must be provided.
 *
 * Note that the token used for the current authentication cannot be updated, and the token cannot be moved
 * to another organization or project.
 */
export type UpdateTokenRequest = {
  organizationId: OrganizationId,
  projectId: ProjectId,
  tokenId: TokenId,

  /**
   * New access scopes for the token, replacing the current list. Cannot be larger that the current authenticated scopes.
   */
  scopes?: string[] | null,

  /**
   * New expiration time. Use `null` to make the token never expire.
   */
  expireAt?: Date | null,

  /**
   * New description of the token
   */
  description?: string | null,

  /**
   * New list of host names allowed to use the token from a web browser, replacing the current list.
   * Erase it to allow any origin.
   *
   * @see IssueTokenRequest.requiredOrigins
   */
  requiredOrigins?: string[] | null,

  /**
   * New list of IP addresses allowed to use the token (IPv4 or CIDR notation), replacing the current list.
   * Erase it to allow any address.
   *
   * @see IssueTokenRequest.requiredIps
   */
  requiredIps?: string[] | null,
}

export type UpdateTokenResponse = {
  /**
   * Id of the updated token
   */
  tokenId: TokenId,

  /**
   * When the token expires, or `undefined` if it never expires
   */
  expiresAt?: Date,
}

export type DeleteTokenRequest = {
  organizationId: OrganizationId,
  projectId: ProjectId,
  tokenId: TokenId,
}

export type DeleteTokenResponse = Record<string, never>;

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
          description: (typeof token.getDescription() == "string" && token.getDescription().length > 0) ? token.getDescription() : null,
        }
      }),
    }
  }

  public issueTokenRequest(req: IssueTokenRequest): auth_pb.IssueTokenRequest {
    const result: auth_pb.IssueTokenRequest = this.factory('auth_pb.IssueTokenRequest');
    if (req.type == "temp") {
        result.setType(auth_pb.IssueTokenRequest.TokenType.TEMP);
    } else if (req.type == "permanent") {
        result.setType(auth_pb.IssueTokenRequest.TokenType.PERMANENT);
    }
    if (req.scopes) {
        result.setScopesList(req.scopes);
    }
    if (req.organizationId) {
        result.setOrganizationId(req.organizationId);
    }
    if (req.projectId) {
        result.setProjectId(req.projectId);
    }
    if (req.description) {
        result.setDescription(req.description);
    }
    if (req.expireAt) {
        result.setExpireAt(req.expireAt.getTime());
    }
    if (req.requiredOrigins && req.requiredOrigins.length > 0) {
        result.setRequiredOriginList(req.requiredOrigins);
    }
    if (req.requiredIps && req.requiredIps.length > 0) {
        result.setRequiredIpList(req.requiredIps);
    }
    return result;
  }

  public issuedTokenResponse(res: auth_pb.IssuedTokenResponse): IssuedTokenResponse {
    return {
      tokenId: res.getTokenId(),
      secret: res.getAuthSecret(),

      // when backed returns 0, it means "never expires" (though it almost always has some actual date).
      // Let's set 10 years from now here, to avoid unnecessary null checks
      expiresAt: res.getExpiresAt() > 0 ? new Date(res.getExpiresAt()) : new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
    }
  }

  public updateTokenRequest(req: UpdateTokenRequest): auth_pb.UpdateTokenRequest {
    const result: auth_pb.UpdateTokenRequest = this.factory('auth_pb.UpdateTokenRequest');
    result.setOrganizationId(req.organizationId);
    result.setProjectId(req.projectId);
    result.setTokenId(req.tokenId);

    // The paths are the field names as defined in the protobuf, not the JS names
    const paths: string[] = [];
    if (req.scopes !== undefined) {
      paths.push("scopes");
      result.setScopesList(req.scopes ?? []);
    }
    if (req.expireAt !== undefined) {
      paths.push("expire_at");
      result.setExpireAt(req.expireAt?.getTime() ?? 0);
    }
    if (req.description !== undefined) {
      paths.push("description");
      result.setDescription(req.description ?? "");
    }
    if (req.requiredOrigins !== undefined) {
      paths.push("required_origin");
      result.setRequiredOriginList(req.requiredOrigins ?? []);
    }
    if (req.requiredIps !== undefined) {
      paths.push("required_ip");
      result.setRequiredIpList(req.requiredIps ?? []);
    }
    if (paths.length == 0) {
      throw new Error("Nothing to update. Specify at least one field to update");
    }

    const mask = this.factory('field_mask_pb.FieldMask');
    mask.setPathsList(paths);
    result.setUpdateMask(mask);

    return result;
  }

  public updateTokenResponse(res: auth_pb.IssuedTokenResponse): UpdateTokenResponse {
    return {
      tokenId: res.getTokenId(),
      expiresAt: res.getExpiresAt() > 0 ? new Date(res.getExpiresAt()) : undefined,
    }
  }

  public deleteTokenRequest(req: DeleteTokenRequest): auth_pb.DeleteTokenRequest {
    const result: auth_pb.DeleteTokenRequest = this.factory('auth_pb.DeleteTokenRequest');
    result.setOrganizationId(req.organizationId);
    result.setProjectId(req.projectId);
    result.setTokenId(req.tokenId);
    return result;
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  public deleteTokenResponse(res: auth_pb.DeleteTokenResponse): DeleteTokenResponse {
    return {};
  }
}

/**
 * A subset of the Auth API used to get credentials
 */
export interface CredentialsClient {
  authenticate(req: AuthRequest): Promise<AuthResponse>;
  refresh(req: RefreshRequest): Promise<AuthResponse>;
}
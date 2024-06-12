import {MessageFactory} from "./typesConvert";
import * as auth_pb from "./generated/auth_pb";

export type AuthCapability = 'JWT_RS256';

export type SecretToken = string;
const SecretTokenRegex = new RegExp('^emrld_[0-9a-zA-Z]{38}$');

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
}

export interface BaseAuthClient {
  authenticate(req: AuthRequest): Promise<AuthResponse>;
  refresh(req: RefreshRequest): Promise<AuthResponse>;
}
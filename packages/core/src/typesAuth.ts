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
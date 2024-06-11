import { Metadata } from '@grpc/grpc-js';

export interface AuthMetadata {
  add(meta: Metadata): void;
  isExpired(): boolean;
}

export class JwtSignature implements AuthMetadata {
  token: string;
  expire: Date;

  constructor(token: string, expire: Date) {
    this.token = token;
    this.expire = expire;
  }

  add(meta: Metadata): void {
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

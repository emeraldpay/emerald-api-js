import { Metadata } from '@grpc/grpc-js';

export interface AuthMetadata {
  add(meta: Metadata);
}

export class JwtSignature implements AuthMetadata {
  readonly token: string;
  readonly expire: Date;

  constructor(token: string, expire: Date) {
    this.token = token;
    this.expire = expire;
  }

  add(meta: Metadata): void {
    meta.add('Authorization', `Bearer ${this.token}`);
  }
}

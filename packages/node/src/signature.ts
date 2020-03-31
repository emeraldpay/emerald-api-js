import {hmac, sha256} from "hash.js";
import {TextEncoder} from 'text-encoding';
import {Metadata} from "grpc";
import {AuthenticationStatus} from "./credentials";

let utf8Encode = new TextEncoder();

export interface AuthMetadata {
    add(meta: Metadata)
}

export class TokenSignature implements AuthMetadata {
    private readonly tokenId: string;
    private readonly secret: string;
    private seq: number;

    constructor(tokenId: string, secret: string) {
        this.tokenId = tokenId;
        this.secret = secret;
        this.seq = 1;
    }

    next(): Signature {
        // @ts-ignore
        const h = hmac(sha256, this.secret);
        const msg = [Date.now(), this.seq++].join("-");
        h.update(utf8Encode.encode(msg));
        return {
            token: this.tokenId,
            msg: msg,
            signature: h.digest('hex')
        }
    }

    add(meta: Metadata) {
        let signature = this.next();
        // console.log("start auth", params.service_url, signature.msg, signature.signature);
        if (!signature) {
            throw new Error("No signature");
        }
        meta.add("token", signature.token);
        meta.add("nonce", signature.msg);
        meta.add("sign", signature.signature);
    }
}

type Signature = {
    token: string,
    msg: string,
    signature: string
}

export class JwtSignature implements AuthMetadata {
    readonly token: string;
    readonly expire: Date;

    constructor(token: string, expire: Date) {
        this.token = token;
        this.expire = expire;
    }

    add(meta: Metadata) {
        meta.add("Authorization", "Bearer " + this.token);
    }
}
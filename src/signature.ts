import {hmac, sha256} from "hash.js";
import { TextEncoder } from 'text-encoding';

let utf8Encode = new TextEncoder();

export class TokenSignature {
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
}

type Signature = {
    token: string,
    msg: string,
    signature: string
}
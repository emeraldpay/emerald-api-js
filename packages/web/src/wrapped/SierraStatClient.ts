import {Publisher, readOnce, sierra} from "@emeraldpay/api";
import {WebChannel, callStream} from "../channel";
import {CredentialsContext} from "../credentials";
import * as sierra_rpc from '../generated/SierraServiceClientPb';
import {classFactory} from "./Factory";

export class SierraStatClient {
    readonly client: sierra_rpc.StatClient;
    readonly channel: WebChannel;
    readonly retries: number;

    private readonly convert = new sierra.ConvertSierra(classFactory);

    constructor(hostname: string, channel: WebChannel, credentials: CredentialsContext, retries = 3) {
        this.client = new sierra_rpc.StatClient(hostname, null, credentials.options);
        this.channel = channel;
        this.retries = retries;
    }

    public getRequestCount(request: sierra.GetRequestCountRequest): Publisher<sierra.GroupRequestCount> {
        const req = this.convert.getRequestCountRequest(request);
        const mapper = this.convert.groupRequestCount();

        const call = callStream(this.client.getRequestCount.bind(this.client), mapper);
        return readOnce(this.channel, call, req, this.retries);
    }

    public getTokenStat(request: sierra.GetTokenStatRequest): Publisher<sierra.TokenStat> {
        const req = this.convert.getTokenStatRequest(request);
        const mapper = this.convert.tokenStat();

        const call = callStream(this.client.getTokenStat.bind(this.client), mapper);
        return readOnce(this.channel, call, req, this.retries);
    }

}

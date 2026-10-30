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

    /**
     * Subscribe to a sample of the current requests to the API that match the filter.
     * The stream is rate limited by the server (usually to ~100 req/min), so it's not guaranteed to have all the requests,
     * and some parts of a request (start, message or close) may be missing. Intended for debugging and monitoring.
     */
    public subscribeLogs(request: sierra.GetLogsRequest): Publisher<sierra.LogResponse> {
        const req = this.convert.getLogsRequest(request);
        const mapper = this.convert.logResponse();

        const call = callStream(this.client.subscribeLogs.bind(this.client), mapper);
        return readOnce(this.channel, call, req, this.retries);
    }

}

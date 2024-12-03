import {publishToPromise, readOnce, sierra} from "@emeraldpay/api";
import {WebChannel, callPromise} from "../channel";
import {CredentialsContext} from "../credentials";
import * as sierra_rpc from '../generated/SierraServiceClientPb';
import {classFactory} from "./Factory";

export class SierraOrgClient {
    readonly client: sierra_rpc.OrgClient;
    readonly channel: WebChannel;
    readonly retries: number;

    private readonly convert = new sierra.ConvertSierra(classFactory);

    constructor(hostname: string, channel: WebChannel, credentials: CredentialsContext, retries = 3) {
        this.client = new sierra_rpc.OrgClient(hostname, null, credentials.options);
        this.channel = channel;
        this.retries = retries;
    }

    public getOrg(request: sierra.GetOrgRequest): Promise<sierra.Org> {
        const req = this.convert.getOrgRequest(request);
        const mapper = this.convert.org();

        const call = callPromise(this.client.getOrg.bind(this.client), mapper);
        return publishToPromise(readOnce(this.channel, call, req, this.retries));
    }

}

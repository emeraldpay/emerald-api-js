import {WebChannel} from "./channel";
import {BlockchainClient} from "./wrapped/BlockchainClient";
import {InsightsClient} from "./wrapped/InsightsClient";
import {MarketClient} from "./wrapped/MarketClient";
import {CredentialsContext, emeraldCredentials} from "./credentials";
import {SecretToken} from "@emeraldpay/api";

export class EmeraldApi {
    private readonly hostname: string;
    private readonly channel: WebChannel;
    private readonly credentials: CredentialsContext;

    constructor(hostname: string, token: SecretToken, credentials?: CredentialsContext) {
        this.hostname = hostname;
        this.credentials = credentials ?? emeraldCredentials(hostname, token);
        this.channel = new WebChannel();
    }

    static devApi(token?: SecretToken | undefined, credentials?: CredentialsContext): EmeraldApi {
        // a dev token with access only from the internal network
        let devToken = token ?? 'emrld_8ntrHbZN67DF8TWKgCMO1I9nSaMG0cpoMhj3GP';
        return new EmeraldApi('https://api.emeraldpay.dev', devToken, credentials);
    }

    static productionApi(token: SecretToken): EmeraldApi {
        return new EmeraldApi('https://api.emrld.io', token);
    }

    /**
     * @deprecated
     */
    insights(): InsightsClient {
        return new InsightsClient(this.hostname, this.channel);
    }

    get blockchain(): BlockchainClient {
        return new BlockchainClient(this.hostname, this.channel, this.credentials);
    }

    get market(): MarketClient {
        return new MarketClient(this.hostname, this.channel, this.credentials);
    }

}

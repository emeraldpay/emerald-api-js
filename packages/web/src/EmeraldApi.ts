import {SecretToken} from "@emeraldpay/api";
import {WebChannel} from "./channel";
import {CredentialsContext, emeraldCredentials} from "./credentials";
import {AuthClient} from "./wrapped/AuthClient";
import {BlockchainClient} from "./wrapped/BlockchainClient";
import {InsightsClient} from "./wrapped/InsightsClient";
import {MarketClient} from "./wrapped/MarketClient";
import {SierraOrgClient} from "./wrapped/SierraOrgClient";
import {SierraProjectClient} from "./wrapped/SierraProjectClient";
import {SierraStatClient} from "./wrapped/SierraStatClient";

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
        const devToken = token ?? 'emrld_pbhT80xj0hsnFf73uOVJ6LEmenaVcbsXO7pGwH';
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

    get sierraProject(): SierraProjectClient {
        return new SierraProjectClient(this.hostname, this.channel, this.credentials);
    }

    get sierraOrg(): SierraOrgClient {
        return new SierraOrgClient(this.hostname, this.channel, this.credentials);
    }

    get sierraStat(): SierraStatClient {
        return new SierraStatClient(this.hostname, this.channel, this.credentials);
    }

    get auth(): AuthClient {
        return new AuthClient(this.hostname, this.channel, this.credentials);
    }

}

import {BlockchainClient} from "./wrapped/BlockchainClient";
import {CredentialsContext, emeraldCredentials} from "./credentials";
import {MonitoringClient} from "./wrapped/MonitoringClient";
import {MarketClient} from "./wrapped/MarketClient";
import {TransactionClient} from "./wrapped/TransactionClient";

export class EmeraldApi {
    private readonly hostname: string;
    private readonly credentials: CredentialsContext;

    static defaultApi(): EmeraldApi {
        return new EmeraldApi("api.emrld.io:443")
    }
    static devApi(): EmeraldApi {
        return new EmeraldApi("api.emeraldpay.dev:443")
    }

    constructor(hostname: string) {
        this.hostname = hostname;
        this.credentials = emeraldCredentials(this.hostname, [], "test");
    }

    blockchain(): BlockchainClient {
        return new BlockchainClient(this.hostname, this.credentials.getChannelCredentials());
    }

    monitoring(): MonitoringClient {
        return new MonitoringClient(this.hostname, this.credentials.getChannelCredentials());
    }

    market(): MarketClient {
        return new MarketClient(this.hostname, this.credentials.getChannelCredentials());
    }

    transaction(): TransactionClient {
        return new TransactionClient(this.hostname, this.credentials.getChannelCredentials());
    }
}

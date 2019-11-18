import {InsightsClient} from "./wrapped/InsightsClient";
import {BlockchainClient} from "./wrapped/BlockchainClient";
import {WebChannel} from "./channel";

const DEFAULT_HOSTNAME="https://api.emrld.io";

export class EmeraldApi {
    private readonly hostname: string;
    private readonly channel: WebChannel;

    constructor(hostname: string | undefined) {
        this.hostname = hostname || DEFAULT_HOSTNAME;
        this.channel = new WebChannel();
    }

    insights(): InsightsClient {
        return new InsightsClient(this.hostname, this.channel);
    }

    blockchain(): BlockchainClient {
        return new BlockchainClient(this.hostname, this.channel);
    }
}
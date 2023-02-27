import {
    alwaysRetry,
    Blockchain,
    ChainHead,
    ConvertBlockchain,
    DataMapper,
    NativeCallError,
    NativeCallItem,
    NativeCallResponse,
    Publisher,
    readOnce,
} from "@emeraldpay/api";
import { callStream, WebChannel } from "../channel";
import * as blockchain_rpc from '../generated/BlockchainServiceClientPb';
import { classFactory } from "./Factory";

export class BlockchainClient {
    readonly client: blockchain_rpc.BlockchainClient;
    readonly channel: WebChannel;
    readonly retries: number;

    private readonly convert = new ConvertBlockchain(classFactory);

    constructor(hostname: string, channel: WebChannel, retries = 3) {
        this.client = new blockchain_rpc.BlockchainClient(hostname);
        this.channel = channel;
        this.retries = retries;
    }

    subscribeHead(blockchain: Blockchain): Publisher<ChainHead> {
        const req = this.convert.chain(blockchain);
        const mapper: DataMapper<any, ChainHead> = this.convert.headResponse();

        const call = callStream(this.client.subscribeHead.bind(this.client), mapper);
        return alwaysRetry(this.channel, call, req);
    }

    nativeCall(chain: Blockchain, calls: NativeCallItem[]): Publisher<NativeCallResponse | NativeCallError> {
        const req = this.convert.nativeCallRequest(chain, calls);
        const mapper: DataMapper<any, NativeCallResponse | NativeCallError> = this.convert.nativeCallResponse();

        const call = callStream(this.client.nativeCall.bind(this.client), mapper);
        return readOnce(this.channel, call, req, this.retries);
    }

}

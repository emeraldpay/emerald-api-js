import * as blockchain_rpc from '../generated/BlockchainServiceClientPb';
import {
    alwaysRetry, Blockchain,
    ChainHead, ConvertBlockchain, DataMapper, NativeCallError,
    NativeCallItem,
    NativeCallResponse,
    Publisher,
    readOnce
} from "@emeraldpay/api-client-core";
import {WebChannel, callStream} from "../channel";
import {classFactory} from "./Factory";

export class BlockchainClient {
    private readonly client: blockchain_rpc.BlockchainClient;
    private readonly channel: WebChannel;
    private readonly convert = new ConvertBlockchain(classFactory);

    constructor(hostname: string, channel: WebChannel) {
        this.client = new blockchain_rpc.BlockchainClient(hostname);
        this.channel = channel;
    }

    subscribeHead(blockchain: Blockchain): Publisher<ChainHead> {
        const req = this.convert.chain(blockchain);
        let mapper: DataMapper<any, ChainHead> = this.convert.headResponse();

        let call = callStream(this.client.subscribeHead.bind(this.client), mapper);
        return alwaysRetry(this.channel, call, req);
    }

    nativeCall(chain: Blockchain, calls: NativeCallItem[]): Publisher<NativeCallResponse | NativeCallError> {
        let req = this.convert.nativeCallRequest(chain, calls);
        let mapper: DataMapper<any, NativeCallResponse | NativeCallError> = this.convert.nativeCallResponse();

        let call = callStream(this.client.nativeCall.bind(this.client), mapper);
        return readOnce(this.channel, call, req);
    }

}


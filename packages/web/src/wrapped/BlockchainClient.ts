import * as blockchain_rpc from '../generated/BlockchainServiceClientPb';
import * as blockchain_pb from "../generated/blockchain_pb";
import {Chain, ChainRef} from "../generated/common_pb";
import {Publisher} from "@emeraldpay/api-client-core";
import {alwaysRetry, WebChannel, callStream} from "../channel";

export class BlockchainClient {
    private readonly client: blockchain_rpc.BlockchainClient;
    private readonly channel: WebChannel;

    constructor(hostname: string, channel: WebChannel) {
        this.client = new blockchain_rpc.BlockchainClient(hostname);
        this.channel = channel;
    }

    subscribeHead(chain: ChainRef): Publisher<ChainHead> {
        let req = new Chain();
        req.setType(chain);
        let call = callStream(this.client.subscribeHead.bind(this.client), (resp: blockchain_pb.ChainHead) => {
            return {
                chain: chain,
                height: resp.getHeight(),
                blockId: resp.getBlockId(),
                timestamp: new Date(resp.getTimestamp())
            } as ChainHead
        });
        return alwaysRetry(this.channel, call, req);
    }
}

export type ChainHead = {
    chain: ChainRef;
    height: number;
    blockId: string;
    timestamp: Date;
}
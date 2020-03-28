import * as blockchain_rpc from '../generated/BlockchainServiceClientPb';
import * as blockchain_pb from "../generated/blockchain_pb";
import {Chain, ChainRef} from "../generated/common_pb";
import {
    alwaysRetry,
    ChainHead, NativeCallError,
    NativeCallItem,
    NativeCallResponse,
    Publisher,
    readOnce
} from "@emeraldpay/api-client-core";
import {WebChannel, callStream} from "../channel";
import {TextDecoder} from "text-encoding";

const textDecoder = new TextDecoder("utf-8");
const textEncoder = new TextEncoder();

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
                chain: chain.valueOf(),
                height: resp.getHeight(),
                blockId: resp.getBlockId(),
                timestamp: new Date(resp.getTimestamp())
            } as ChainHead
        });
        return alwaysRetry(this.channel, call, req);
    }

    nativeCall(chain: ChainRef, calls: NativeCallItem[]): Publisher<NativeCallResponse | NativeCallError> {
        let req = new blockchain_pb.NativeCallRequest();
        req.setChain(chain);
        calls.forEach((c) => {
            let call = new blockchain_pb.NativeCallItem();
            call.setId(c.id);
            call.setMethod(c.method);
            call.setPayload(textEncoder.encode(JSON.stringify(c.payload)));
            req.addItems(call)
        });

        let call = callStream(this.client.nativeCall.bind(this.client), (resp: blockchain_pb.NativeCallReplyItem) => {
            if (resp.getSucceed()) {
                return {
                    id: resp.getId(),
                    success: true,
                    payload: JSON.parse(textDecoder.decode(resp.getPayload_asU8()))
                } as NativeCallResponse
            } else {
                return {
                    id: resp.getId(),
                    success: false
                } as NativeCallError
            }
        });
        return readOnce(this.channel, call, req);
    }

}


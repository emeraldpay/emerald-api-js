import * as blockchain_pb from "./generated/blockchain_pb";
import * as common_pb from "./generated/common_pb";
import {DataMapper} from "./Publisher";
import {AnyAddress, Asset, Blockchain, isMultiAddress, isSingleAddress, SingleAddress} from "./typesCommon";
import {MessageFactory} from "./convert";
import {TextDecoder, TextEncoder} from "text-encoding";

const textDecoder = new TextDecoder("utf-8");
const textEncoder = new TextEncoder();

export type ChainHead = {
    chain: number;
    height: number;
    blockId: string;
    timestamp: Date;
}

export type NativeCallItem = {
    id: number;
    method: string;
    payload: Array<any>
}

export type NativeCallResponse = {
    id: number;
    payload: any;
    success: boolean;
}

export type NativeCallError = {
    id: number;
    success: boolean;
}

export type BalanceRequest = {
    asset: Asset,
    address: AnyAddress
}

export type AddressBalance = {
    asset: Asset,
    address: SingleAddress,
    balance: string
}

export class ConvertBlockchain {
    private factory: MessageFactory;

    constructor(factory: MessageFactory) {
        this.factory = factory;
    }

    public chain(blockchain: Blockchain): common_pb.Chain {
        let req: common_pb.Chain = this.factory("common_pb.Chain");
        req.setType(blockchain.valueOf());
        return req
    }

    public headResponse(): DataMapper<blockchain_pb.ChainHead, ChainHead> {
        return (resp: blockchain_pb.ChainHead) => {
            return {
                chain: resp.getChain().valueOf(),
                height: resp.getHeight(),
                blockId: resp.getBlockId(),
                timestamp: new Date(resp.getTimestamp())
            }
        };
    }

    public nativeCallRequest(chain: Blockchain, calls: NativeCallItem[]): blockchain_pb.NativeCallRequest {
        let req: blockchain_pb.NativeCallRequest = this.factory("blockchain_pb.NativeCallRequest");
        req.setChain(chain.valueOf());
        calls.forEach((c) => {
            let call: blockchain_pb.NativeCallItem = this.factory("blockchain_pb.NativeCallItem");
            call.setId(c.id);
            call.setMethod(c.method);
            call.setPayload(new Uint8Array(textEncoder.encode(JSON.stringify(c.payload))));
            req.addItems(call);
        });
        return req
    }

    public nativeCallResponse(): DataMapper<blockchain_pb.NativeCallReplyItem, NativeCallResponse | NativeCallError> {
        return (resp: blockchain_pb.NativeCallReplyItem) => {
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
        };
    }

    public balanceRequest(req: BalanceRequest): blockchain_pb.BalanceRequest {
        let result: blockchain_pb.BalanceRequest = this.factory("blockchain_pb.BalanceRequest");
        let protoAsset: common_pb.Asset = this.factory("common_pb.Asset");
        protoAsset.setChain(req.asset.blockchain.valueOf());
        protoAsset.setCode(req.asset.code);
        result.setAsset(protoAsset);

        let protoAnyAddress: common_pb.AnyAddress = this.factory("common_pb.AnyAddress");
        if (isSingleAddress(req.address)) {
            let protoSingleAddress: common_pb.SingleAddress = this.factory("common_pb.SingleAddress");
            protoSingleAddress.setAddress(req.address);
            protoAnyAddress.setAddressSingle(protoSingleAddress);
        } else if (isMultiAddress(req.address)) {
            let protoMultiAddress: common_pb.MultiAddress = this.factory("common_pb.MultiAddress");
            req.address.forEach((address) => {
                let protoSingleAddress: common_pb.SingleAddress = this.factory("common_pb.SingleAddress");
                protoSingleAddress.setAddress(address);
                protoMultiAddress.addAddresses(protoSingleAddress);
            });
            protoAnyAddress.setAddressMulti(protoMultiAddress);
        }
        result.setAddress(protoAnyAddress);

        return result
    }

    public balanceResponse(): DataMapper<blockchain_pb.AddressBalance, AddressBalance> {
        return (resp: blockchain_pb.AddressBalance) => {
            let asset: Asset = {
                blockchain: resp.getAsset().getChain().valueOf(),
                // @ts-ignore
                code: resp.getAsset().getCode()
            };
            return {
                asset,
                address: resp.getAddress().getAddress(),
                balance: resp.getBalance()
            }
        }
    }

}
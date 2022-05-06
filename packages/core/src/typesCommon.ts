import {MessageFactory} from "./convert";
import * as common_pb from "./generated/common_pb";

export enum Blockchain {
    UNSPECIFIED = 0,
    BITCOIN = 1,
    GRIN = 2,
    ETHEREUM = 100,
    ETHEREUM_CLASSIC = 101,
    TESTNET_KOVAN = 10002,
    TESTNET_BITCOIN = 10003,
    TESTNET_FLOONET = 10004,
    TESTNET_GOERLI = 10005,
    TESTNET_ROPSTEN = 10006,
    TESTNET_RINKEBY = 10007,
}

export type AssetCode = string;

export type Asset = {
    blockchain: Blockchain,
    code: AssetCode
}

export type SingleAddress = string;
export type XpubAddress = string | DetailedXpubAddress;
export type MultiAddress = SingleAddress[];
export type AnyAddress = SingleAddress | MultiAddress | XpubAddress;

export interface DetailedXpubAddress {
    xpub: string;
    start?: number;
    limit?: number;
    unused_limit?: number;
}

export interface BlockInfo {
    height: number;
    hash: string;
    timestamp: Date;
}

export function isSingleAddress(address: AnyAddress): address is SingleAddress {
    return typeof address == 'string' && !isXpubAddress(address);
}

export function isMultiAddress(address: AnyAddress): address is MultiAddress {
    return typeof address == 'object' && typeof address[0] == 'string';
}

export function isXpubAddress(address: AnyAddress): address is XpubAddress {
    if (typeof address == "object") {
        return isDetailedXpubAddress(address)
    }
    if (typeof address != 'string') {
        return false;
    }
    if (address.length < 111 || address.length > 112) {
        return false;
    }
    const type = address.substring(0, 4).toLowerCase();
    return type == "xpub" || type == "ypub" || type == "zpub" || type == "tpub" || type == "upub" || type == "vpub";
}

export function isDetailedXpubAddress(address: AnyAddress): address is DetailedXpubAddress {
    return address && typeof address == "object" &&
        Object.entries(address)
            .some((a) =>
                a[0] === 'xpub' && typeof a[1] === "string" && isXpubAddress(a[1])
            );
}

export function asDetailedXpub(adress: XpubAddress): DetailedXpubAddress {
    if (typeof adress == "string") {
        return {
            xpub: adress
        }
    }
    return adress
}

export class ConvertCommon {
    private readonly factory: MessageFactory;

    constructor(factory: MessageFactory) {
        this.factory = factory;
    }

    public chain(blockchain: Blockchain): common_pb.Chain {
        let result: common_pb.Chain = this.factory("common_pb.Chain");
        result.setType(blockchain.valueOf());
        return result
    }

    public pbAsset(asset: Asset): common_pb.Asset {
        let protoAsset: common_pb.Asset = this.factory("common_pb.Asset");
        protoAsset.setChain(asset.blockchain.valueOf());
        protoAsset.setCode(asset.code);
        return protoAsset;
    }

    public asset(asset: common_pb.Asset): Asset {
        return {
            blockchain: asset.getChain().valueOf(),
            // @ts-ignore
            code: asset.getCode()
        };
    }

    public blockInfo(blockInfo: common_pb.BlockInfo): BlockInfo {
        return {
            height: blockInfo.getHeight(),
            hash: blockInfo.getBlockId(),
            timestamp: new Date(blockInfo.getTimestamp()),
        }
    }

    public pbAnyAddress(address: AnyAddress): common_pb.AnyAddress {
        let protoAnyAddress: common_pb.AnyAddress = this.factory("common_pb.AnyAddress");
        if (isSingleAddress(address)) {
            let protoSingleAddress: common_pb.SingleAddress = this.factory("common_pb.SingleAddress");
            protoSingleAddress.setAddress(address);
            protoAnyAddress.setAddressSingle(protoSingleAddress);
        } else if (isXpubAddress(address)) {
            let protoXpubAddress: common_pb.XpubAddress = this.factory("common_pb.XpubAddress");
            let xpub = asDetailedXpub(address);
            protoXpubAddress.setXpub(xpub.xpub);
            if (xpub.start) {
                protoXpubAddress.setStart(xpub.start);
            }
            if (typeof xpub.limit === "number") {
                protoXpubAddress.setLimit(xpub.limit);
            } else {
                protoXpubAddress.setLimit(100);
            }
            if (xpub.unused_limit && xpub.unused_limit > 0) {
                protoXpubAddress.setUnusedLimit(xpub.unused_limit)
            }
            protoAnyAddress.setAddressXpub(protoXpubAddress);
        } else if (isMultiAddress(address)) {
            let protoMultiAddress: common_pb.MultiAddress = this.factory("common_pb.MultiAddress");
            address.forEach((address) => {
                let protoSingleAddress: common_pb.SingleAddress = this.factory("common_pb.SingleAddress");
                protoSingleAddress.setAddress(address);
                protoMultiAddress.addAddresses(protoSingleAddress);
            });
            protoAnyAddress.setAddressMulti(protoMultiAddress);
        }
        return protoAnyAddress;
    }
}

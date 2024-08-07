import * as common_pb from './generated/common_pb';
import { MessageFactory } from './typesConvert';

export enum BlockchainType {
  UNSPECIFIED = 0,
  BITCOIN = 1,
  GRIN = 2,
  ETHEREUM = 100,
}

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
  TESTNET_HOLESKY = 10008,
  TESTNET_SEPOLIA = 10009,
}

export type AssetCode = string;

export type Asset = {
  blockchain: Blockchain;
  code: AssetCode;
};

export type Erc20Asset = {
  blockchain: Blockchain;
  contractAddress: string;
};

export type AnyAsset = Asset | Erc20Asset;

export type SingleAddress = string;
export type XpubAddress = string | DetailedXpubAddress;
export type MultiAddress = SingleAddress[];
export type AnyAddress = SingleAddress | MultiAddress | XpubAddress;

export type UUID = string;

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
  if (typeof address == 'object') {
    return isDetailedXpubAddress(address);
  }
  if (typeof address != 'string') {
    return false;
  }
  if (address.length < 111 || address.length > 112) {
    return false;
  }
  const type = address.substring(0, 4).toLowerCase();
  return type == 'xpub' || type == 'ypub' || type == 'zpub' || type == 'tpub' || type == 'upub' || type == 'vpub';
}

export function isDetailedXpubAddress(address: AnyAddress): address is DetailedXpubAddress {
  return (
    address &&
    typeof address == 'object' &&
    Object.entries(address).some((a) => a[0] === 'xpub' && typeof a[1] === 'string' && isXpubAddress(a[1]))
  );
}

export function asDetailedXpub(address: XpubAddress): DetailedXpubAddress {
  if (typeof address == 'string') {
    return {
      xpub: address,
    };
  }

  return address;
}

export function isAsset(asset: unknown): asset is Asset {
  return typeof asset === 'object' && 'code' in asset;
}

export function isErc20Asset(asset: unknown): asset is Erc20Asset {
  return typeof asset === 'object' && 'contractAddress' in asset;
}

export function blockchainType(blockchain: Blockchain): BlockchainType {
  switch (blockchain) {
    case Blockchain.BITCOIN:
    case Blockchain.TESTNET_BITCOIN:
      return BlockchainType.BITCOIN;
    case Blockchain.GRIN:
    case Blockchain.TESTNET_FLOONET:
      return BlockchainType.GRIN;
    case Blockchain.ETHEREUM:
    case Blockchain.ETHEREUM_CLASSIC:
    case Blockchain.TESTNET_KOVAN:
    case Blockchain.TESTNET_GOERLI:
    case Blockchain.TESTNET_ROPSTEN:
    case Blockchain.TESTNET_RINKEBY:
    case Blockchain.TESTNET_HOLESKY:
    case Blockchain.TESTNET_SEPOLIA:
      return BlockchainType.ETHEREUM;
    case Blockchain.UNSPECIFIED:
    default:
      return BlockchainType.UNSPECIFIED;
  }
}

export class ConvertCommon {
  private readonly factory: MessageFactory;

  constructor(factory: MessageFactory) {
    this.factory = factory;
  }

  public chain(blockchain: Blockchain): common_pb.Chain {
    const result: common_pb.Chain = this.factory('common_pb.Chain');

    result.setType(blockchain.valueOf());

    return result;
  }

  public pbAsset(asset: Asset): common_pb.Asset {
    const protoAsset: common_pb.Asset = this.factory('common_pb.Asset');

    protoAsset.setChain(asset.blockchain.valueOf());
    protoAsset.setCode(asset.code);

    return protoAsset;
  }

  public asset(asset: common_pb.Asset): Asset {
    return {
      code: asset.getCode(),
      blockchain: asset.getChain().valueOf(),
    };
  }

  public erc20Asset(asset: common_pb.Erc20Asset): Erc20Asset {
    return {
      blockchain: asset.getChain().valueOf(),
      contractAddress: asset.getContractAddress(),
    };
  }

  public pbErc20Asset(asset: Erc20Asset): common_pb.Erc20Asset {
    const protoAsset: common_pb.Erc20Asset = this.factory('common_pb.Erc20Asset');

    protoAsset.setChain(asset.blockchain.valueOf());
    protoAsset.setContractAddress(asset.contractAddress);

    return protoAsset;
  }

  public blockInfo(blockInfo: common_pb.BlockInfo): BlockInfo {
    return {
      height: blockInfo.getHeight(),
      hash: blockInfo.getBlockId(),
      timestamp: new Date(blockInfo.getTimestamp()),
    };
  }

  public pbAnyAddress(address: AnyAddress): common_pb.AnyAddress {
    const protoAnyAddress: common_pb.AnyAddress = this.factory('common_pb.AnyAddress');

    if (isSingleAddress(address)) {
      const protoSingleAddress: common_pb.SingleAddress = this.factory('common_pb.SingleAddress');

      protoSingleAddress.setAddress(address);
      protoAnyAddress.setAddressSingle(protoSingleAddress);
    } else if (isXpubAddress(address)) {
      const protoXpubAddress = this.pbXpubAddress(address);

      protoAnyAddress.setAddressXpub(protoXpubAddress);
    } else if (isMultiAddress(address)) {
      const protoMultiAddress: common_pb.MultiAddress = this.factory('common_pb.MultiAddress');

      address.forEach((address) => {
        const protoSingleAddress: common_pb.SingleAddress = this.factory('common_pb.SingleAddress');

        protoSingleAddress.setAddress(address);
        protoMultiAddress.addAddresses(protoSingleAddress);
      });

      protoAnyAddress.setAddressMulti(protoMultiAddress);
    }
    return protoAnyAddress;
  }

  public pbSingleAddress(address: SingleAddress): common_pb.SingleAddress {
    const protoSingleAddress: common_pb.SingleAddress = this.factory('common_pb.SingleAddress');

    protoSingleAddress.setAddress(address);

    return protoSingleAddress;
  }

  public pbXpubAddress(address: XpubAddress): common_pb.XpubAddress {
    const protoXpubAddress: common_pb.XpubAddress = this.factory('common_pb.XpubAddress');
    const xpub = asDetailedXpub(address);

    protoXpubAddress.setXpub(xpub.xpub);

    if (xpub.start) {
      protoXpubAddress.setStart(xpub.start);
    }

    if (typeof xpub.limit === 'number') {
      protoXpubAddress.setLimit(xpub.limit);
    } else {
      protoXpubAddress.setLimit(100);
    }

    if (xpub.unused_limit && xpub.unused_limit > 0) {
      protoXpubAddress.setUnusedLimit(xpub.unused_limit);
    }

    return protoXpubAddress;
  }
}

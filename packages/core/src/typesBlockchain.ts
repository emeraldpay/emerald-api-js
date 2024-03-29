import * as blockchain_pb from './generated/blockchain_pb';
import * as common_pb from './generated/common_pb';
import { DataMapper } from './Publisher';
import { AnyAddress, AnyAsset, Blockchain, ConvertCommon, SingleAddress, isAsset, isErc20Asset } from './typesCommon';
import { MessageFactory } from './typesConvert';

const textDecoder = new TextDecoder('utf-8');
const textEncoder = new TextEncoder();

export type ChainHead = {
  chain: number;
  height: number;
  blockId: string;
  timestamp: Date;
};

export type NativeCallItem = {
  id: number;
  method: string;
  payload: Array<any>;
};

export type NativeCallResponse = {
  id: number;
  payload: any;
  success: boolean;
};

export type NativeCallError = {
  id: number;
  success: boolean;
  message: string | undefined;
};

export function isNativeCallResponse(obj: NativeCallResponse | NativeCallError): obj is NativeCallResponse {
  return typeof obj === 'object' && obj.success;
}

export function isNativeCallError(obj: NativeCallResponse | NativeCallError): obj is NativeCallError {
  return typeof obj === 'object' && !obj.success;
}

export type BalanceRequest = {
  asset: AnyAsset;
  address: AnyAddress;
  includeUtxo?: boolean;
};

export interface AddressBalance {
  asset: AnyAsset;
  address: SingleAddress;
  balance: string;
  utxo?: Utxo[] | undefined;
}

export interface Utxo {
  txid: string;
  vout: number;
  value: string;
  spent: boolean;
}

export interface TxStatusRequest {
  blockchain: number;
  txid: string;
  limit: number;
}

export interface TxStatusResponse {
  txid: string;
  broadcast: boolean;
  mined: boolean;
  block?: {
    height: number;
    hash: string;
    timestamp: Date;
  };
  confirmations: number;
}

/**
 * Request for a Fee Estimation
 */
export interface EstimateFeeRequest {
  // blockchain
  blockchain: number;
  mode: EstimationMode;
  blocks: number;
}

/**
 * Mode of estimation:
 *  avgLast - Average over last transaction in each block
 *  avgTail5 - Average over transaction 5th from the end in each block
 *  avgTail20 - Average over transaction 20th from the end in each block
 *  avgTail50 - Average over transaction 50th from the end in each block
 *  minAlways - Minimal fee that would be accepted by every last block
 *  avgMiddle - Average over transaction in the middle of each block
 *  avgTop - Average over transaction in head of each block. Note that for Bitcoin it doesn't count COINBASE tx as top tx.
 */
export type EstimationMode = 'avgLast' | 'avgTail5' | 'avgTail20' | 'avgTail50' | 'minAlways' | 'avgMiddle' | 'avgTop';

export interface EthereumStdFees {
  type: 'ethereumStd';
  /**
   * Fee value in Wei
   */
  fee: string;
}

export interface EthereumExtFees {
  type: 'ethereumExt';
  /**
   * Estimated fee that would be actually paid. I.e. it's the Base Fee + Priority Fee
   */
  expect: string;
  /**
   * Priority Fee in Wei
   */
  priority: string;
  /**
   * Max Fee value in Wei. Note that it only indicated current preference and actual Max may be significantly lower, depending on the usage scenario.
   */
  max: string;
}

export interface BitcoinStdFees {
  type: 'bitcoinStd';
  /**
   * Fee in Satoshi per Kilobyte. Note that the actual fee calculation MUST divide it by 1024 at the last step to get a fair fee.
   */
  satPerKb: number;
}

export type EstimateFeeResponse = EthereumExtFees | EthereumStdFees | BitcoinStdFees;

export function isEthereumStdFees(obj: EstimateFeeResponse): obj is EthereumStdFees {
  return obj.type == 'ethereumStd';
}

export function isEthereumExtFees(obj: EstimateFeeResponse): obj is EthereumExtFees {
  return obj.type == 'ethereumExt';
}

export function isBitcoinStdFees(obj: EstimateFeeResponse): obj is BitcoinStdFees {
  return obj.type == 'bitcoinStd';
}

export class ConvertBlockchain {
  private readonly factory: MessageFactory;
  private readonly common: ConvertCommon;

  constructor(factory: MessageFactory, common: ConvertCommon = new ConvertCommon(factory)) {
    this.factory = factory;
    this.common = common;
  }

  public chain(blockchain: Blockchain): common_pb.Chain {
    const req: common_pb.Chain = this.factory('common_pb.Chain');
    req.setType(blockchain.valueOf());
    return req;
  }

  public headResponse(): DataMapper<blockchain_pb.ChainHead, ChainHead> {
    return (resp: blockchain_pb.ChainHead) => {
      return {
        chain: resp.getChain().valueOf(),
        height: resp.getHeight(),
        blockId: resp.getBlockId(),
        timestamp: new Date(resp.getTimestamp()),
      };
    };
  }

  public nativeCallRequest(chain: Blockchain, calls: NativeCallItem[]): blockchain_pb.NativeCallRequest {
    const req: blockchain_pb.NativeCallRequest = this.factory('blockchain_pb.NativeCallRequest');
    req.setChain(chain.valueOf());
    calls.forEach((c) => {
      const call: blockchain_pb.NativeCallItem = this.factory('blockchain_pb.NativeCallItem');
      call.setId(c.id);
      call.setMethod(c.method);
      call.setPayload(new Uint8Array(textEncoder.encode(JSON.stringify(c.payload))));
      req.addItems(call);
    });
    return req;
  }

  public nativeCallResponse(): DataMapper<blockchain_pb.NativeCallReplyItem, NativeCallResponse | NativeCallError> {
    return (resp: blockchain_pb.NativeCallReplyItem) => {
      if (resp.getSucceed()) {
        return {
          id: resp.getId(),
          success: true,
          payload: JSON.parse(textDecoder.decode(resp.getPayload_asU8())),
        } as NativeCallResponse;
      } else {
        return {
          id: resp.getId(),
          success: false,
          message: resp.getErrormessage(),
        } as NativeCallError;
      }
    };
  }

  public balanceRequest(req: BalanceRequest): blockchain_pb.BalanceRequest {
    const result: blockchain_pb.BalanceRequest = this.factory('blockchain_pb.BalanceRequest');

    if (isAsset(req.asset)) {
      result.setAsset(this.common.pbAsset(req.asset));
    } else if (isErc20Asset(req.asset)) {
      result.setErc20Asset(this.common.pbErc20Asset(req.asset));
    }

    if (typeof req.includeUtxo == 'boolean') {
      result.setIncludeUtxo(req.includeUtxo);
    }

    result.setAddress(this.common.pbAnyAddress(req.address));

    return result;
  }

  public balanceResponse(): DataMapper<blockchain_pb.AddressBalance, AddressBalance> {
    return (resp: blockchain_pb.AddressBalance) => {
      let asset;

      if (resp.hasAsset()) {
        asset = this.common.asset(resp.getAsset());
      } else if (resp.hasErc20Asset()) {
        asset = this.common.erc20Asset(resp.getErc20Asset());
      } else {
        throw new Error('Invalid response: neither asset nor erc20Asset is set');
      }

      let utxo: Utxo[] | undefined = undefined;

      if (resp.getUtxoList().length > 0) {
        utxo = resp.getUtxoList().map((it) => {
          return {
            txid: it.getTxId(),
            vout: it.getIndex(),
            value: it.getBalance(),
            spent: it.getSpent() || false,
          };
        });
      }
      return {
        asset,
        address: resp.getAddress().getAddress(),
        balance: resp.getBalance(),
        utxo,
      };
    };
  }

  public txRequest(req: TxStatusRequest): blockchain_pb.TxStatusRequest {
    const p = this.factory('blockchain_pb.TxStatusRequest');
    p.setChain(req.blockchain);
    p.setTxId(req.txid);
    p.setConfirmationLimit(req.limit < 0 ? 0 : req.limit);
    return p;
  }

  public txResponse(): DataMapper<blockchain_pb.TxStatus, TxStatusResponse> {
    return (resp) => {
      let block;
      if (resp.hasBlock()) {
        block = this.common.blockInfo(resp.getBlock());
      } else {
        block = undefined;
      }
      return {
        broadcast: resp.getBroadcasted(),
        confirmations: resp.getConfirmations(),
        mined: resp.getMined(),
        txid: resp.getTxId(),
        block,
      };
    };
  }

  public estimationMode(mode: EstimationMode): blockchain_pb.FeeEstimationMode {
    switch (mode) {
      case 'avgLast':
        return blockchain_pb.FeeEstimationMode.AVG_LAST;
      case 'avgMiddle':
        return blockchain_pb.FeeEstimationMode.AVG_MIDDLE;
      case 'avgTop':
        return blockchain_pb.FeeEstimationMode.AVG_TOP;
      case 'avgTail5':
        return blockchain_pb.FeeEstimationMode.AVG_T5;
      case 'avgTail20':
        return blockchain_pb.FeeEstimationMode.AVG_T20;
      case 'avgTail50':
        return blockchain_pb.FeeEstimationMode.AVG_T50;
      case 'minAlways':
        return blockchain_pb.FeeEstimationMode.MIN_ALWAYS;
    }
    return blockchain_pb.FeeEstimationMode.INVALID;
  }

  public estimateFeeRequest(req: EstimateFeeRequest): blockchain_pb.EstimateFeeRequest {
    const p = this.factory('blockchain_pb.EstimateFeeRequest');
    p.setChain(req.blockchain);
    p.setMode(this.estimationMode(req.mode));
    p.setBlocks(req.blocks);
    return p;
  }

  public estimateFeeResponse(): DataMapper<blockchain_pb.EstimateFeeResponse, EstimateFeeResponse> {
    return (resp) => {
      if (resp.hasEthereumextended()) {
        const value = resp.getEthereumextended();
        const result: EthereumExtFees = {
          type: 'ethereumExt',
          expect: value.getExpect(),
          max: value.getMax(),
          priority: value.getPriority(),
        };
        return result;
      }
      if (resp.hasEthereumstd()) {
        const result: EthereumStdFees = {
          type: 'ethereumStd',
          fee: resp.getEthereumstd().getFee(),
        };
        return result;
      }
      if (resp.hasBitcoinstd()) {
        const result: BitcoinStdFees = {
          type: 'bitcoinStd',
          satPerKb: resp.getBitcoinstd().getSatperkb(),
        };
        return result;
      }
      throw Error('Unsupported EstimateFee response');
    };
  }
}

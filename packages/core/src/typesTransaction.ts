import * as transaction_message_pb from './generated/transaction.message_pb';
import { DataMapper } from './Publisher';
import {
  AnyAddress,
  Asset,
  BlockInfo,
  Blockchain,
  BlockchainType,
  ConvertCommon,
  SingleAddress,
  XpubAddress,
  blockchainType,
} from './typesCommon';
import { MessageFactory } from './typesConvert';

export enum Direction {
  RECEIVE = 0,
  SEND = 1,
}

export enum ChangeType {
  CHANGE = 0,
  FEE = 1,
}

export type BalanceRequest = {
  asset: Asset;
  address: AnyAddress;
};

export interface BalanceResponse {
  asset: Asset;
  address: SingleAddress[];
  balance: string;
}

export type XpubStateRequest = {
  blockchain: Blockchain;
  address: XpubAddress;
};

export interface XpubState {
  blockchain: Blockchain;
  address: XpubAddress;
  lastAddress?: SingleAddress;
  lastIndex?: number;
}

export interface AddressTxRequest {
  blockchain: Blockchain;
  address: AnyAddress;
  cursor?: string;
  limit?: number;
  /** For Bitcoin, allows to query all unspent transactions to that address */
  onlyUnspent?: boolean;
}

export interface AddressTxResponse {
  blockchain: Blockchain;
  /** self address */
  address: SingleAddress;
  /** index of address in xpub if xpub has been requested */
  xpubIndex?: number;
  txId: string;
  /** N/A for mempool */
  block?: BlockInfo;
  mempool: boolean;
  /** N/A for mempool and last blocks (unconfirmed) */
  cursor?: string;
  /** True if transaction is removed from blockchain */
  removed: boolean;
  /** True if transaction is failed */
  failed: boolean;
  changes: Change[];
}

export interface AddressAmount {
  address?: SingleAddress;
  /** unsigned amount */
  amount: string;
}

export interface Change {
  direction: Direction;
  /** change address if detected, could be empty */
  address?: SingleAddress;
  /** unsigned amount */
  amount: string;

  type: ChangeType;
  /** ERC-20 token address, optional, undefined for blockchain native token */
  contractAddress?: string;
  /** index of address in xpub if detected */
  xpubIndex?: number;
}

export interface GenericTransfer {
  direction: Direction;
  /** unsigned amount */
  amount: string;
  /** indexes of counterparty addresses in xpub if xpub has been requested if detected */
  xpubIndexes: number[];
}

export interface EthereumTransfer extends GenericTransfer {
  /** unsigned fee amount */
  fee: string;
  /** counterparty address */
  address: SingleAddress;
  /** e.g. ERC-20 token address, optional, undefined for blockchain native token */
  contractAddress?: string;
}

export interface BitcoinTransfer extends GenericTransfer {
  /** counterparty address or self address for change */
  addressAmounts: AddressAmount[];
}

export type AnyTransfer = GenericTransfer | EthereumTransfer | BitcoinTransfer;

export class Convert {
  private readonly factory: MessageFactory;
  private readonly common: ConvertCommon;

  constructor(factory: MessageFactory, common: ConvertCommon = new ConvertCommon(factory)) {
    this.factory = factory;
    this.common = common;
  }

  public balanceRequest(req: BalanceRequest): transaction_message_pb.BalanceRequest {
    const result: transaction_message_pb.BalanceRequest = this.factory('transaction_message_pb.BalanceRequest');
    return result.setAsset(this.common.pbAsset(req.asset)).setAddress(this.common.pbAnyAddress(req.address));
  }

  public balanceResponse(): DataMapper<transaction_message_pb.BalanceResponse, BalanceResponse> {
    return (resp) => {
      return {
        asset: this.common.asset(resp.getAsset()),
        address: resp.getAddressList()?.map((value) => value.getAddress()),
        balance: resp.getBalance(),
      };
    };
  }

  public xpubStateRequest(req: XpubStateRequest): transaction_message_pb.XpubStateRequest {
    const result: transaction_message_pb.XpubStateRequest = this.factory('transaction_message_pb.XpubStateRequest');
    return result.setBlockchain(req.blockchain.valueOf()).setAddress(this.common.pbXpubAddress(req.address));
  }

  public xpubState(): DataMapper<transaction_message_pb.XpubState, XpubState> {
    return (resp) => {
      return {
        blockchain: resp.getBlockchain().valueOf(),
        address: resp.getAddress().getXpub(),
        lastAddress: resp.hasLastAddress() ? resp.getLastAddress().getAddress() : undefined,
        lastIndex: resp.hasLastIndex() ? resp.getLastIndex().getValue() : undefined,
      };
    };
  }

  public addressTxRequest(req: AddressTxRequest): transaction_message_pb.AddressTxRequest {
    const result: transaction_message_pb.AddressTxRequest = this.factory('transaction_message_pb.AddressTxRequest');
    return result
      .setBlockchain(req.blockchain.valueOf())
      .setAddress(this.common.pbAnyAddress(req.address))
      .setCursor(req.cursor)
      .setLimit(req.limit)
      .setOnlyUnspent(req.onlyUnspent);
  }

  private static change(change: transaction_message_pb.Change): Change {
    return {
      direction: change.getDirection(),
      address: change.hasAddress() ? change.getAddress().getAddress() : undefined,
      amount: change.getAmount(),
      type: change.getType(),
      contractAddress: change.hasContractAddress() ? change.getContractAddress().getAddress() : undefined,
      xpubIndex: change.hasXpubIndex() ? change.getXpubIndex().getValue() : undefined,
    };
  }

  public addressTxResponse(): DataMapper<transaction_message_pb.AddressTxResponse, AddressTxResponse> {
    return (resp) => {
      let block: BlockInfo | undefined;

      if (resp.hasBlock()) {
        block = this.common.blockInfo(resp.getBlock());
      }

      const blockchain = resp.getBlockchain().valueOf();
      const changes = resp.getChangesList().map((value) => Convert.change(value));
      const cursor = resp.getCursor();
      const mempool = resp.getMempool();
      const xpubIndex = resp.hasXpubIndex() ? resp.getXpubIndex().getValue() : undefined;

      return {
        block,
        blockchain,
        changes,
        mempool,
        xpubIndex,
        address: resp.getAddress().getAddress(),
        cursor: cursor.length > 0 ? cursor : undefined,
        failed: resp.getFailed(),
        removed: resp.getRemoved(),
        txId: resp.getTxId(),
      };
    };
  }

}

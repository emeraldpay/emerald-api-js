import * as transaction_message_pb from './generated/transaction.message_pb';
import { DataMapper } from './Publisher';
import {
  AnyAddress,
  BlockInfo,
  Blockchain,
  ConvertCommon,
  SingleAddress,
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

export interface GetTransactionsRequest {
  blockchain: Blockchain;
  address: AnyAddress;
  cursor?: string;
  limit?: number;
  /** For Bitcoin, allows to query all unspent transactions to that address */
  onlyUnspent?: boolean;
}

export interface SubscribeTransactionsRequest {
  blockchain: Blockchain;
  address: AnyAddress;
}

export interface AddressTransaction {
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

export class ConvertTransaction {
  private readonly factory: MessageFactory;
  private readonly common: ConvertCommon;

  constructor(factory: MessageFactory, common: ConvertCommon = new ConvertCommon(factory)) {
    this.factory = factory;
    this.common = common;
  }

  public getTransactionsRequest(req: GetTransactionsRequest): transaction_message_pb.GetTransactionsRequest {
    const result: transaction_message_pb.GetTransactionsRequest = this.factory('transaction_message_pb.GetTransactionsRequest');
    return result
      .setChain(req.blockchain.valueOf())
      .setAddress(this.common.pbAnyAddress(req.address))
      .setCursor(req.cursor)
      .setLimit(req.limit)
      .setUnspentOnly(req.onlyUnspent);
  }

  public subscribeTransactionsRequest(req: SubscribeTransactionsRequest): transaction_message_pb.SubscribeTransactionsRequest {
    const result: transaction_message_pb.SubscribeTransactionsRequest = this.factory('transaction_message_pb.SubscribeTransactionsRequest');
    return result
        .setChain(req.blockchain.valueOf())
        .setAddress(this.common.pbAnyAddress(req.address))
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

  public addressTransaction(): DataMapper<transaction_message_pb.AddressTransaction, AddressTransaction> {
    return (resp) => {
      let block: BlockInfo | undefined;

      if (resp.hasBlock()) {
        block = this.common.blockInfo(resp.getBlock());
      }

      const blockchain = resp.getChain().valueOf();
      const changes = resp.getChangesList().map((value) => ConvertTransaction.change(value));
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

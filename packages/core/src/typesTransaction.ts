import * as transaction_message_pb from './generated/transaction.message_pb';
import { DataMapper } from './Publisher';
import {
  AnyAddress,
  BlockInfo,
  Blockchain,
  ConvertCommon,
  SingleAddress,
} from './typesCommon';
import { MessageFactory, required } from './typesConvert';

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
  /**
   *  Get transactions is Descending order, i.e., start from the newest and go backwards.
   *  Default: false (i.e., Ascending, from oldest to newest)
   */
  descending?: boolean;
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
    let result: transaction_message_pb.GetTransactionsRequest = this.factory('transaction_message_pb.GetTransactionsRequest');
    result = result
      .setChain(req.blockchain.valueOf())
      .setAddress(this.common.pbAnyAddress(req.address));
    if (req.cursor != null) {
        result = result.setCursor(req.cursor);
    }
    if (req.limit != null) {
        result = result.setLimit(req.limit);
    }
    if (typeof req.onlyUnspent === 'boolean') {
        result = result.setUnspentOnly(req.onlyUnspent);
    }
    if (typeof req.descending === 'boolean') {
        result = result.setDescending(req.descending);
    }
    return result;
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
      address: change.getAddress()?.getAddress(),
      amount: change.getAmount(),
      type: change.getType(),
      contractAddress: change.getContractAddress()?.getAddress(),
      xpubIndex: change.getXpubIndex()?.getValue(),
    };
  }

  public addressTransaction(): DataMapper<transaction_message_pb.AddressTransaction, AddressTransaction> {
    return (resp) => {
      const pbBlock = resp.getBlock();
      const block: BlockInfo | undefined = pbBlock ? this.common.blockInfo(pbBlock) : undefined;

      const blockchain = resp.getChain().valueOf();
      const changes = resp.getChangesList().map((value) => ConvertTransaction.change(value));
      const cursor = resp.getCursor();
      const mempool = resp.getMempool();
      const xpubIndex = resp.getXpubIndex()?.getValue();

      return {
        block,
        blockchain,
        changes,
        mempool,
        xpubIndex,
        address: required(resp.getAddress(), 'address').getAddress(),
        cursor: cursor.length > 0 ? cursor : undefined,
        failed: resp.getFailed(),
        removed: resp.getRemoved(),
        txId: resp.getTxId(),
      };
    };
  }

}

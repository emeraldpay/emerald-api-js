import {AnyAddress, Asset, Blockchain, ConvertCommon, SingleAddress} from "./typesCommon";
import {MessageFactory} from "./convert";
import * as transaction_message_pb from "./generated/transaction.message_pb";
import {DataMapper} from "./Publisher";

export enum Direction {
    EARN = 0,
    SPEND = 1,
}

export type BalanceRequest = {
    asset: Asset,
    address: AnyAddress,
}

export interface BalanceResponse {
    asset: Asset;
    address: SingleAddress[];
    balance: string;
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
    /** self address */
    address: SingleAddress;
    /** index of address in xpub if xpub has been requested */
    xpubIndex?: number;
    txId: string;
    /** N/A for mempool */
    block?: {
        height: number;
        hash: string;
        timestamp: Date;
    },
    mempool?: boolean;
    /** N/A for mempool and last blocks (unconfirmed) */
    cursor?: string;
    /** rue if transaction is removed from blockchain */
    removed?: boolean;
    transfers: Transfer[];
}

export interface Transfer {
    direction: Direction;
    amount: number;
    /** currently unimplemented for Bitcoin */
    fee?: number;
    /** counterparty address or self address for change */
    addresses: SingleAddress[];
    /** indexes of counterparty addresses in xpub if xpub has been requested if detected */
    xpubIndexes?: number[];
}

export class Convert {
    private readonly factory: MessageFactory;
    private readonly common: ConvertCommon;

    constructor(factory: MessageFactory, common: ConvertCommon = new ConvertCommon(factory)) {
        this.factory = factory;
        this.common = common;
    }

    public balanceRequest(req: BalanceRequest): transaction_message_pb.BalanceRequest {
        let result: transaction_message_pb.BalanceRequest = this.factory("transaction_pb.BalanceRequest");
        return result.setAsset(this.common.pbAsset(req.asset))
            .setAddress(this.common.pbAnyAddress(req.address))
    }

    public balanceResponse(): DataMapper<transaction_message_pb.BalanceResponse, BalanceResponse> {
        return (resp) => {
            return {
                asset: this.common.asset(resp.getAsset()),
                address: resp.getAddressList()?.map( value => value.getAddress() ),
                balance: resp.getBalance(),
            }
        }
    }

    public addressTxRequest(req: AddressTxRequest): transaction_message_pb.AddressTxRequest {
        let result: transaction_message_pb.AddressTxRequest = this.factory("transaction_pb.AddressTxRequest");
        return result.setBlockchain(req.blockchain.valueOf())
            .setAddress(this.common.pbAnyAddress(req.address))
            .setCursor(req.cursor)
            .setLimit(req.limit)
            .setOnlyUnspent(req.onlyUnspent)
    }

    private static transfer(transfer: transaction_message_pb.Transfer): Transfer {
        return {
            direction: transfer.getDirection(),
            amount: transfer.getAmount()!,
            fee: transfer.getFee(),
            addresses: transfer.getAddressesList().map( value => value.getAddress() ),
            xpubIndexes: transfer.getXpubIndexesList(),
        }
    }

    public addressTxResponse(): DataMapper<transaction_message_pb.AddressTxResponse, AddressTxResponse> {
        return (resp) => {
            let block;
            if (resp.hasBlock()) {
                block = this.common.blockInfo(resp.getBlock()!)
            } else {
                block = undefined;
            }
            let transfers = resp.getTransfersList().map(value => Convert.transfer(value))
            return {
                address: resp.getAddress().getAddress(),
                xpubIndex: resp.getXpubIndex(),
                txId: resp.getTxId(),
                block: block,
                mempool: resp.getMempool(),
                cursor: resp.getCursor(),
                removed: resp.getRemoved(),
                transfers: transfers,
            }
        }
    }
}

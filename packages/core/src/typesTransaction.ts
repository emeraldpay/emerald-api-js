import {AnyAddress, Asset, Blockchain, ConvertCommon, SingleAddress} from "./typesCommon";
import {MessageFactory} from "./convert";
import * as transaction_pb from "./generated/transaction_pb";
import {DataMapper} from "./Publisher";

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
    /** one of the addresses is self address, the second is counterparty address or self address for change */
    addressFrom?: SingleAddress;
    addressTo?: SingleAddress;
    amount: number;
    /** currently unimplemented for Bitcoin */
    fee?: number;
    /** requested xpub indexes of addresses in transfer if detected */
    xpubIndeces?: number[];
}

export class Convert {
    private readonly factory: MessageFactory;
    private readonly common: ConvertCommon;

    constructor(factory: MessageFactory, common: ConvertCommon = new ConvertCommon(factory)) {
        this.factory = factory;
        this.common = common;
    }

    public balanceRequest(req: BalanceRequest): transaction_pb.BalanceRequest {
        let result: transaction_pb.BalanceRequest = this.factory("transaction_pb.BalanceRequest");
        return result.setAsset(this.common.pbAsset(req.asset))
            .setAddress(this.common.pbAnyAddress(req.address))
    }

    public balanceResponse(): DataMapper<transaction_pb.BalanceResponse, BalanceResponse> {
        return (resp) => {
            return {
                asset: this.common.asset(resp.getAsset()),
                address: resp.getAddressList()?.map( value => value.getAddress() ),
                balance: resp.getBalance(),
            }
        }
    }

    public addressTxRequest(req: AddressTxRequest): transaction_pb.AddressTxRequest {
        let result: transaction_pb.AddressTxRequest = this.factory("transaction_pb.AddressTxRequest");
        return result.setBlockchain(req.blockchain.valueOf())
            .setAddress(this.common.pbAnyAddress(req.address))
            .setCursor(req.cursor)
            .setLimit(req.limit)
            .setOnlyUnspent(req.onlyUnspent)
    }

    private static transfer(transfer: transaction_pb.Transfer): Transfer {
        return {
            addressFrom: transfer.getAddressFrom()?.getAddress(),
            addressTo: transfer.getAddressTo()?.getAddress(),
            amount: transfer.getAmount()!,
            fee: transfer.getFee(),
            xpubIndeces: transfer.getXpubIndexesList(),
        }
    }

    public addressTxResponse(): DataMapper<transaction_pb.AddressTxResponse, AddressTxResponse> {
        return (resp) => {
            let block;
            if (resp.hasBlock()) {
                block = this.common.blockInfo(resp.getBlock()!)
            } else {
                block = undefined;
            }
            let transfers = resp.getTransfersList().map(value => Convert.transfer(value))
            return {
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

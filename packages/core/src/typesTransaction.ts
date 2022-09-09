import {AnyAddress, Asset, Blockchain, BlockchainType, blockchainType, ConvertCommon, SingleAddress, XpubAddress} from "./typesCommon";
import {MessageFactory} from "./convert";
import * as transaction_message_pb from "./generated/transaction.message_pb";
import {DataMapper} from "./Publisher";

export enum Direction {
    RECEIVE = 0,
    SEND = 1,
}

export enum ChangeType {
    CHANGE = 0,
    FEE = 1,
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

export type XpubStateRequest = {
    blockchain: Blockchain;
    address: XpubAddress,
}

export interface XpubState {
    blockchain: Blockchain;
    address: XpubAddress,
    lastAddress?: SingleAddress,
    lastIndex?: number
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
    block?: {
        height: number;
        hash: string;
        timestamp: Date;
    },
    mempool: boolean;
    /** N/A for mempool and last blocks (unconfirmed) */
    cursor: string;
    /** True if transaction is removed from blockchain */
    removed: boolean;
    /** True if transaction is failed */
    failed: boolean;
    changes: Change[];
    /** TODO: deprecated */
    transfers: AnyTransfer[];
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

export type AnyTransfer = GenericTransfer | EthereumTransfer | BitcoinTransfer

export class Convert {
    private readonly factory: MessageFactory;
    private readonly common: ConvertCommon;

    constructor(factory: MessageFactory, common: ConvertCommon = new ConvertCommon(factory)) {
        this.factory = factory;
        this.common = common;
    }

    public balanceRequest(req: BalanceRequest): transaction_message_pb.BalanceRequest {
        let result: transaction_message_pb.BalanceRequest = this.factory("transaction_message_pb.BalanceRequest");
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

    public xpubStateRequest(req: XpubStateRequest): transaction_message_pb.XpubStateRequest {
        let result: transaction_message_pb.XpubStateRequest = this.factory("transaction_message_pb.XpubStateRequest");
        return result.setBlockchain(req.blockchain.valueOf())
            .setAddress(this.common.pbXpubAddress(req.address))
    }

    public xpubState(): DataMapper<transaction_message_pb.XpubState, XpubState> {
        return (resp) => {
            return {
                blockchain:  resp.getBlockchain().valueOf(),
                address: resp.getAddress().getXpub(),
                lastAddress: (resp.hasLastAddress()) ? resp.getLastAddress().getAddress() : undefined,
                lastIndex: (resp.hasLastIndex()) ? resp.getLastIndex().getValue() : undefined,
            }
        }
    }

    public addressTxRequest(req: AddressTxRequest): transaction_message_pb.AddressTxRequest {
        let result: transaction_message_pb.AddressTxRequest = this.factory("transaction_message_pb.AddressTxRequest");
        return result.setBlockchain(req.blockchain.valueOf())
            .setAddress(this.common.pbAnyAddress(req.address))
            .setCursor(req.cursor)
            .setLimit(req.limit)
            .setOnlyUnspent(req.onlyUnspent)
    }

    private static change(change: transaction_message_pb.Change): Change {
        return {
            direction: change.getDirection(),
            address: (change.hasAddress()) ? change.getAddress().getAddress() : undefined,
            amount: change.getAmount(),
            type: change.getType(),
            contractAddress: (change.hasContractAddress()) ? change.getContractAddress().getAddress() : undefined,
            xpubIndex: (change.hasXpubIndex()) ? change.getXpubIndex().getValue() : undefined,
        }
    }

    private static transfer(blockchain: Blockchain, transfer: transaction_message_pb.Transfer): AnyTransfer {
        if (blockchainType(blockchain) == BlockchainType.BITCOIN) {
            return {
                direction: transfer.getDirection(),
                amount: transfer.getAmount(),
                addressAmounts: transfer.getAddressAmountsList().map(value => {
                    return {
                        address: value.getAddress()?.getAddress(),
                        amount: value.getAmount(),
                    }
                }),
                xpubIndexes: transfer.getXpubIndexesList(),
            }
        }
        if (blockchainType(blockchain) == BlockchainType.ETHEREUM) {
            const [firstAddressAmount] = transfer.getAddressAmountsList()
            if (firstAddressAmount == null) {
                throw new Error("Address of ETHEREUM transfer is empty")
            }
            return {
                direction: transfer.getDirection(),
                amount: transfer.getAmount(),
                fee: transfer.getFee(),
                address: firstAddressAmount.getAddress().getAddress(),
                xpubIndexes: transfer.getXpubIndexesList(),
                contractAddress: transfer.getContractaddress() != "" ? transfer.getContractaddress() : undefined,
            }
        }
        return {
            direction: transfer.getDirection(),
            amount: transfer.getAmount(),
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
            let blockchain = resp.getBlockchain().valueOf()
            let xpubIndex = (resp.hasXpubIndex()) ? resp.getXpubIndex().getValue() : undefined;
            let transfers = resp.getTransfersList().map(value => Convert.transfer(blockchain, value))
            let changes = resp.getChangesList().map(value => Convert.change(value))
            return {
                blockchain: blockchain,
                address: resp.getAddress().getAddress(),
                xpubIndex: xpubIndex,
                txId: resp.getTxId(),
                block: block,
                mempool: resp.getMempool(),
                cursor: resp.getCursor(),
                removed: resp.getRemoved(),
                failed: resp.getFailed(),
                transfers: transfers,
                changes: changes,
            }
        }
    }
}

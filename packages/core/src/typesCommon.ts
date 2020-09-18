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

export type AssetCode = 'ETHER' | 'DAI' | 'TETHER' | 'BTC';

export type Asset = {
    blockchain: Blockchain,
    code: AssetCode
}

export type SingleAddress = string;
export type MultiAddress = SingleAddress[]
export type AnyAddress = SingleAddress | MultiAddress;

export function isSingleAddress(address: AnyAddress): address is SingleAddress {
    return typeof address == 'string'
}

export function isMultiAddress(address: AnyAddress): address is MultiAddress {
    return typeof address == 'object' && typeof address[0] == 'string'
}

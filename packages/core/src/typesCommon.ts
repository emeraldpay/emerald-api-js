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
export type XpubAddress = string | DetailedXpubAddress;
export type MultiAddress = SingleAddress[];
export type AnyAddress = SingleAddress | MultiAddress | XpubAddress;

export interface DetailedXpubAddress {
    xpub: string;
    start?: number;
    limit?: number;
    path?: string;
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

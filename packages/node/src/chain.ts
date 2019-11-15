import {Chain, ChainRef} from './generated/common_pb';

const allTypes = [
    ChainRef.CHAIN_BITCOIN, ChainRef.CHAIN_LIGHTNING, ChainRef.CHAIN_GRIN,
    ChainRef.CHAIN_ETHEREUM,
    ChainRef.CHAIN_ETHEREUM_CLASSIC,
    ChainRef.CHAIN_MORDEN, ChainRef.CHAIN_KOVAN, ChainRef.CHAIN_TESTNET_BITCOIN, ChainRef.CHAIN_FLOONET
];

export class ChainSpec {
    id: number;
    code: string;
    fullname: string;
    customId?: number;

    constructor(id: number, code: string, fullname: string) {
        this.id = id;
        this.code = code;
        this.fullname = fullname;
    }

    public toProtobuf(): Chain {
        const type = allTypes.find((it) => it.valueOf() === this.id);
        if (!type) {
            return null;
        }
        const result = new Chain();
        result.setType(type);
        return result;
    }
}

export const CHAINS = {
    UNSPECIFIED: new ChainSpec(0, 'UNKNOWN', 'Unknown'),

    BITCOIN: new ChainSpec(1,'BTC', 'Bitcoin'),
    GRIN: new ChainSpec(2, 'GRIN', 'Grin'),

    // Networks with tokens
    ETHEREUM: new ChainSpec(100, 'ETH', 'Ethereum'),
    ETHEREUM_CLASSIC: new ChainSpec(101, 'ETC', 'Ethereum Classic'),

    // Sidechains and state channels
    LIGHTNING: new ChainSpec(1001, 'BTC_LN', 'Bitcoin Lightning'),


    // Testnets
    MORDEN: new ChainSpec(10001, 'MORDEN', 'Morden Ethereum Testnet'),
    KOVAN: new ChainSpec(10002, 'KOVAN', 'Kovan Ethereum Testnet'),
    BITCOIN_TESTNET: new ChainSpec(10003, 'BITCOIN_TESTNET', 'Bitcoin Testnet'),
    FLOONET: new ChainSpec(10004, 'FLOONET', 'Floonet Grin Testnet'),

    // Non standard/custom starts from 50000
    CUSTOM: new ChainSpec(50000, 'CUSTOM', 'Custom Chain')
};

const all = [
    CHAINS.BITCOIN, CHAINS.GRIN,
    CHAINS.ETHEREUM, CHAINS.ETHEREUM_CLASSIC,
    CHAINS.LIGHTNING,
    CHAINS.MORDEN, CHAINS.KOVAN, CHAINS.BITCOIN_TESTNET, CHAINS.FLOONET,
    CHAINS.UNSPECIFIED,
    CHAINS.CUSTOM
];

export function chainByCode(code: string): ChainSpec {
    return all.find((it) => it.code.toLowerCase() === code.toLowerCase()) || CHAINS.UNSPECIFIED
}




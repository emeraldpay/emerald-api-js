import {Chain, ChainRef} from './generated/common_pb';

const allTypes = [
    ChainRef.CHAIN_BITCOIN, ChainRef.CHAIN_LIGHTNING, ChainRef.CHAIN_GRIN,
    ChainRef.CHAIN_ETHEREUM,
    ChainRef.CHAIN_ETHEREUM_CLASSIC,
    ChainRef.CHAIN_MORDEN
];

export class ChainSpec {
    id: number;
    code: string;
    fullname: string;

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
    BITCOIN: new ChainSpec(1,'BTC', 'Bitcoin'),
    LIGHTNING: new ChainSpec(101, 'BTC_LN', 'Bitcoin Lightning'),
    GRIN: new ChainSpec(10, 'GRIN', 'Grin'),

    // Networks with tokens
    ETHEREUM: new ChainSpec(20, 'ETH', 'Ethereum'),
    ETHEREUM_CLASSIC: new ChainSpec(21, 'ETC', 'Ethereum Classic'),

    // Testnets
    MORDEN: new ChainSpec(1001, 'MORDEN', 'Morden Testnet'),

    UNSPECIFIED: new ChainSpec(9, 'UNKNOWN', 'Unknown'),
};

const all = [
    CHAINS.BITCOIN, CHAINS.LIGHTNING, CHAINS.GRIN,
    CHAINS.ETHEREUM,
    CHAINS.ETHEREUM_CLASSIC,
    CHAINS.MORDEN,
    CHAINS.UNSPECIFIED
];

export function chainByCode(code: string): ChainSpec {
    return all.find((it) => it.code.toLowerCase() === code.toLowerCase()) || CHAINS.UNSPECIFIED
}




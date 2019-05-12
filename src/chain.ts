import {Chain} from './generated/common_pb';

const allTypes = [
    Chain.Type.BITCOIN, Chain.Type.LIGHTNING, Chain.Type.GRIN, Chain.Type.TETHER,
    Chain.Type.ETHEREUM, Chain.Type.DAI,
    Chain.Type.ETHEREUM_CLASSIC, Chain.Type.BITETHER,
    Chain.Type.MORDEN
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
    BITCOIN: new ChainSpec(0,'BTC', 'Bitcoin'),
    LIGHTNING: new ChainSpec(1, 'BTC_LN', 'Bitcoin Lightning'),
    GRIN: new ChainSpec(30, 'GRIN', 'Grin'),
    TETHER: new ChainSpec(40, 'USDT', 'Tether'),

    // Networks with tokens
    ETHEREUM: new ChainSpec(100, 'ETH', 'Ethereum'),
    DAI: new ChainSpec(101, 'Dai', 'Dai'),

    ETHEREUM_CLASSIC: new ChainSpec(200, 'ETC', 'Ethereum Classic'),
    BITETHER: new ChainSpec(201, 'BEC', 'Bitether'),

    // Testnets
    MORDEN: new ChainSpec(1001, 'MORDEN', 'Mordent Testnet'),

    UNKNOWN: new ChainSpec(999999, 'Unknown', 'Unknown'),
};

const all = [
    CHAINS.BITCOIN, CHAINS.LIGHTNING, CHAINS.GRIN, CHAINS.TETHER,
    CHAINS.ETHEREUM, CHAINS.DAI,
    CHAINS.ETHEREUM_CLASSIC, CHAINS.BITETHER,
    CHAINS.MORDEN,
    CHAINS.UNKNOWN
];

export function chainByCode(code: string): ChainSpec {
    return all.find((it) => it.code === code) || CHAINS.UNKNOWN
}




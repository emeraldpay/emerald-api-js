import {Chain, ChainRef} from './generated/common_pb';

const allTypes = [
    ChainRef.CHAIN_BITCOIN,
    ChainRef.CHAIN_ETHEREUM, ChainRef.CHAIN_MATIC,
    ChainRef.CHAIN_ETHEREUM_CLASSIC,
    ChainRef.CHAIN_RSK,
    ChainRef.CHAIN_MORDEN, ChainRef.CHAIN_KOVAN, ChainRef.CHAIN_GOERLI, ChainRef.CHAIN_ROPSTEN, ChainRef.CHAIN_RINKEBY,
    ChainRef.CHAIN_TESTNET_BITCOIN,
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

    BITCOIN: new ChainSpec(1, 'BTC', 'Bitcoin'),
    GRIN: new ChainSpec(2, 'GRIN', 'Grin'),

    // Networks with tokens
    ETHEREUM: new ChainSpec(100, 'ETH', 'Ethereum'),
    ETHEREUM_CLASSIC: new ChainSpec(101, 'ETC', 'Ethereum Classic'),
    MATIC: new ChainSpec(102, 'MATIC', 'Matic'),

    // Testnets
    MORDEN: new ChainSpec(10001, 'MORDEN', 'Morden Ethereum Testnet'),
    KOVAN: new ChainSpec(10002, 'KOVAN', 'Kovan Ethereum Testnet'),
    BITCOIN_TESTNET: new ChainSpec(10003, 'BITCOIN_TESTNET', 'Bitcoin Testnet'),
    GOERLI: new ChainSpec(10005, 'GOERLI', 'Goerli Ethereum Testnet'),
    ROPSTEN: new ChainSpec(10006, 'ROPSTEN', 'Ropsten Ethereum Testnet'),
    RINKEBY: new ChainSpec(10007, 'RINKEBY', 'Rinkeby Ethereum Testnet'),

    // Non standard/custom starts from 50000
    CUSTOM: new ChainSpec(50000, 'CUSTOM', 'Custom Chain')
};

const all = [
    CHAINS.BITCOIN, CHAINS.GRIN,
    CHAINS.ETHEREUM, CHAINS.ETHEREUM_CLASSIC, CHAINS.MATIC,
    CHAINS.MORDEN, CHAINS.KOVAN, CHAINS.BITCOIN_TESTNET, CHAINS.GOERLI, CHAINS.ROPSTEN, CHAINS.RINKEBY,
    CHAINS.UNSPECIFIED,
    CHAINS.CUSTOM
];

export function chainByCode(code: string): ChainSpec {
    return all.find((it) => it.code.toLowerCase() === code.toLowerCase()) || CHAINS.UNSPECIFIED
}




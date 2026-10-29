import {Chain, ChainRef} from './generated/common_pb';

/**
 * All chain ids defined by the Protobuf `ChainRef`, except CHAIN_UNSPECIFIED which doesn't refer to any actual chain
 */
const protobufIds: number[] = Object.values(ChainRef)
    .filter((it): it is ChainRef => typeof it === 'number' && it !== ChainRef.CHAIN_UNSPECIFIED);

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

    /**
     * Converts to the Protobuf reference
     *
     * @returns the chain, or `null` if it's not an actual chain defined by the Protobuf (i.e., UNSPECIFIED, GRIN or CUSTOM)
     */
    public toProtobuf(): Chain | null {
        if (!protobufIds.includes(this.id)) {
            return null;
        }
        const result = new Chain();
        result.setType(this.id);
        return result;
    }
}

export const CHAINS = {
    UNSPECIFIED: new ChainSpec(0, 'UNKNOWN', 'Unknown'),

    BITCOIN: new ChainSpec(ChainRef.CHAIN_BITCOIN, 'BTC', 'Bitcoin'),
    // Not supported by the API
    GRIN: new ChainSpec(2, 'GRIN', 'Grin'),

    // Networks with tokens
    ETHEREUM: new ChainSpec(ChainRef.CHAIN_ETHEREUM, 'ETH', 'Ethereum'),
    ETHEREUM_CLASSIC: new ChainSpec(ChainRef.CHAIN_ETHEREUM_CLASSIC, 'ETC', 'Ethereum Classic'),
    FANTOM: new ChainSpec(ChainRef.CHAIN_FANTOM, 'FTM', 'Fantom'),
    MATIC: new ChainSpec(ChainRef.CHAIN_MATIC, 'MATIC', 'Matic'),
    RSK: new ChainSpec(ChainRef.CHAIN_RSK, 'RSK', 'Bitcoin RSK'),

    // Testnets
    /** @deprecated */
    MORDEN: new ChainSpec(ChainRef.CHAIN_MORDEN, 'MORDEN', 'Morden Ethereum Testnet'),
    /** @deprecated */
    KOVAN: new ChainSpec(ChainRef.CHAIN_KOVAN, 'KOVAN', 'Kovan Ethereum Testnet'),
    /** @deprecated use BITCOIN_TESTNET_V4 */
    BITCOIN_TESTNET: new ChainSpec(ChainRef.CHAIN_TESTNET_BITCOIN, 'BITCOIN_TESTNET', 'Bitcoin Testnet'),
    BITCOIN_TESTNET_V4: new ChainSpec(ChainRef.CHAIN_TESTNET_BITCOIN_4, 'TESTNET_BITCOIN_V4', 'Bitcoin Testnet V4'),
    /** @deprecated use SEPOLIA */
    GOERLI: new ChainSpec(ChainRef.CHAIN_GOERLI, 'GOERLI', 'Goerli Ethereum Testnet'),
    /** @deprecated use HOODI */
    ROPSTEN: new ChainSpec(ChainRef.CHAIN_ROPSTEN, 'ROPSTEN', 'Ropsten Ethereum Testnet'),
    /** @deprecated use SEPOLIA */
    RINKEBY: new ChainSpec(ChainRef.CHAIN_RINKEBY, 'RINKEBY', 'Rinkeby Ethereum Testnet'),
    /** @deprecated use HOODI */
    HOLESKY: new ChainSpec(ChainRef.CHAIN_HOLESKY, 'HOLESKY', 'Holesky Ethereum Testnet'),
    SEPOLIA: new ChainSpec(ChainRef.CHAIN_SEPOLIA, 'SEPOLIA', 'Sepolia Ethereum Testnet'),
    HOODI: new ChainSpec(ChainRef.CHAIN_HOODI, 'HOODI', 'Hoodi Ethereum Testnet'),

    // Non standard/custom starts from 50000
    CUSTOM: new ChainSpec(50000, 'CUSTOM', 'Custom Chain')
};

const all: ChainSpec[] = Object.values(CHAINS);

export function chainByCode(code: string): ChainSpec {
    return all.find((it) => it.code.toLowerCase() === code.toLowerCase()) || CHAINS.UNSPECIFIED
}

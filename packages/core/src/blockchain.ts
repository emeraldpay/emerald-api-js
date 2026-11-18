import { Blockchain } from './typesCommon';

/**
 * Human-readable names for each known blockchain.
 *
 * Typed as `Record<Blockchain, string>` so the compiler fails the build when a new value is added to
 * the `Blockchain` enum without a corresponding name here.
 */
const BLOCKCHAIN_NAMES: Readonly<Record<Blockchain, string>> = Object.freeze({
  [Blockchain.UNSPECIFIED]: 'Unspecified',
  [Blockchain.BITCOIN]: 'Bitcoin',
  [Blockchain.GRIN]: 'Grin',
  [Blockchain.ETHEREUM]: 'Ethereum',
  [Blockchain.ETHEREUM_CLASSIC]: 'Ethereum Classic',
  [Blockchain.TESTNET_KOVAN]: 'Kovan Testnet',
  [Blockchain.TESTNET_BITCOIN]: 'Bitcoin Testnet',
  [Blockchain.TESTNET_FLOONET]: 'Floonet Testnet',
  [Blockchain.TESTNET_GOERLI]: 'Goerli Testnet',
  [Blockchain.TESTNET_ROPSTEN]: 'Ropsten Testnet',
  [Blockchain.TESTNET_RINKEBY]: 'Rinkeby Testnet',
  [Blockchain.TESTNET_HOLESKY]: 'Holesky Testnet',
  [Blockchain.TESTNET_SEPOLIA]: 'Sepolia Testnet',
});

/**
 * Returns a human-readable name for the blockchain, suitable for display (e.g., `Ethereum Classic`, `Sepolia Testnet`).
 *
 * The code may come from the server as a raw number that is not (yet) defined in the `Blockchain` enum of this
 * library version. In that case the function doesn't throw, and returns a generic name that includes the numeric
 * code, e.g. `Unknown Blockchain (102)`.
 *
 * @param blockchain blockchain code
 * @returns name of the blockchain
 */
export function blockchainName(blockchain: Blockchain): string {
  // use `hasOwn` so a value outside the enum never resolves to an inherited property of the object
  if (Object.prototype.hasOwnProperty.call(BLOCKCHAIN_NAMES, blockchain)) {
    return BLOCKCHAIN_NAMES[blockchain];
  }
  return `Unknown Blockchain (${blockchain})`;
}

/**
 * First and last+1 codes of the testnet range, as defined by the `ChainRef` numbering scheme in `common.proto`:
 * all testnets start with 10_000, and non-standard chains start with 20_000.
 */
const TESTNET_RANGE_START = 10_000;
const TESTNET_RANGE_END = 20_000;

/**
 * Checks if the blockchain is a testnet (e.g., `TESTNET_SEPOLIA`, `TESTNET_BITCOIN`).
 *
 * The check relies on the numbering scheme of `ChainRef` rather than on a fixed list, so it also gives the right
 * answer for a testnet code that is not (yet) defined in the `Blockchain` enum of this library version.
 *
 * @param blockchain blockchain code
 * @returns `true` if it's a testnet, `false` for a mainnet or an unspecified blockchain
 */
export function isTestnet(blockchain: Blockchain): boolean {
  return blockchain >= TESTNET_RANGE_START && blockchain < TESTNET_RANGE_END;
}

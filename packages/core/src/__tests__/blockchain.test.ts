import { blockchainName, isTestnet } from '../blockchain';
import { Blockchain } from '../typesCommon';

describe('blockchainName', () => {
  test.each([
    [Blockchain.UNSPECIFIED, 'Unspecified'],
    [Blockchain.BITCOIN, 'Bitcoin'],
    [Blockchain.GRIN, 'Grin'],
    [Blockchain.ETHEREUM, 'Ethereum'],
    [Blockchain.ETHEREUM_CLASSIC, 'Ethereum Classic'],
    [Blockchain.TESTNET_KOVAN, 'Kovan Testnet'],
    [Blockchain.TESTNET_BITCOIN, 'Bitcoin Testnet'],
    [Blockchain.TESTNET_FLOONET, 'Floonet Testnet'],
    [Blockchain.TESTNET_GOERLI, 'Goerli Testnet'],
    [Blockchain.TESTNET_ROPSTEN, 'Ropsten Testnet'],
    [Blockchain.TESTNET_RINKEBY, 'Rinkeby Testnet'],
    [Blockchain.TESTNET_HOLESKY, 'Holesky Testnet'],
    [Blockchain.TESTNET_SEPOLIA, 'Sepolia Testnet'],
  ])('for %s', (blockchain, expected) => {
    expect(blockchainName(blockchain)).toBe(expected);
  });

  test('has a distinct name for every enum value', () => {
    const codes = Object.values(Blockchain).filter((v): v is Blockchain => typeof v === 'number');
    const names = codes.map(blockchainName);

    expect(names.some((name) => name.startsWith('Unknown'))).toBeFalsy();
    expect(new Set(names).size).toBe(codes.length);
  });

  test('for a code not in the enum', () => {
    expect(blockchainName(102 as Blockchain)).toBe('Unknown Blockchain (102)');
  });

  test('ignores inherited object properties', () => {
    expect(blockchainName('toString' as unknown as Blockchain)).toBe('Unknown Blockchain (toString)');
  });
});

describe('isTestnet', () => {
  test.each([
    Blockchain.TESTNET_KOVAN,
    Blockchain.TESTNET_BITCOIN,
    Blockchain.TESTNET_FLOONET,
    Blockchain.TESTNET_GOERLI,
    Blockchain.TESTNET_ROPSTEN,
    Blockchain.TESTNET_RINKEBY,
    Blockchain.TESTNET_HOLESKY,
    Blockchain.TESTNET_SEPOLIA,
  ])('true for testnet %s', (blockchain) => {
    expect(isTestnet(blockchain)).toBe(true);
  });

  test.each([
    Blockchain.UNSPECIFIED,
    Blockchain.BITCOIN,
    Blockchain.GRIN,
    Blockchain.ETHEREUM,
    Blockchain.ETHEREUM_CLASSIC,
  ])('false for %s', (blockchain) => {
    expect(isTestnet(blockchain)).toBe(false);
  });

  test('true for a testnet code not in the enum', () => {
    // CHAIN_HOODI in the proto
    expect(isTestnet(10010 as Blockchain)).toBe(true);
  });

  test('false for a sidechain code not in the enum', () => {
    // CHAIN_MATIC in the proto
    expect(isTestnet(1002 as Blockchain)).toBe(false);
  });

  test('respects the boundaries of the testnet range', () => {
    expect(isTestnet(9_999 as Blockchain)).toBe(false);
    expect(isTestnet(10_000 as Blockchain)).toBe(true);
    expect(isTestnet(19_999 as Blockchain)).toBe(true);
    expect(isTestnet(20_000 as Blockchain)).toBe(false);
  });
});

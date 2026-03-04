import * as market_pb from './generated/market_pb';
import * as common_pb from './generated/common_pb';
import { DataMapper } from './Publisher';
import { Blockchain, ConvertCommon, Erc20Asset, isErc20Asset } from './typesCommon';
import { MessageFactory } from './typesConvert';

export type CryptoCurrency = 'BTC' | 'ETC' | 'ETH';
export type StablecoinCurrency = 'DAI' | 'USDT' | 'USDC';
export type CountryCurrency =
  | 'USD'
  | 'EUR'
  | 'CAD'
  | 'GBP'
  | 'RUB'
  | 'JPY'
  | 'CHF'
  | 'CNY'
  | 'MXN'
  | 'BRL'
  | 'HKD'
  | 'KRW'
  | 'SGD'
  | 'INR';
export type TestCurrency = 'MONOPOLY' | 'KOVAN' | 'TEST_BTC' | 'TEST_BTC_V4' | 'SEPOLIA';

export type BaseCurrency = CryptoCurrency | StablecoinCurrency | CountryCurrency | TestCurrency;
export type AnyCurrency = BaseCurrency | Erc20Asset;


/**
 * Currency pair
 */
export type Pair = {
  base: AnyCurrency;
  target: AnyCurrency;
};

/**
 * Request the rate at specified moment.
 */
export type GetRatesRequestAt = {
  // Request the rate at the specified moment.
  timestamp: number | Date;
  // The rates
  pairs: Pair[];
}

/**
 * Request the rate at the moment of the specified block.
 */
export type GetRatesRequestByBlock = {
  // Request the rate at the moment of the specified block.
  block: BlockRefAtHeight | BlockRefAtHash;
  // The rates
  pairs: Pair[];
}

/**
 * Reference to a block by its height.
 */
export type BlockRefAtHeight = {
  // The blockchain to which the block belongs.
  blockchain: Blockchain,
  // The height of the block.
  height: number,
}

/**
 * Reference to a block by its hash.
 */
export type BlockRefAtHash = {
  // The blockchain to which the block belongs.
  blockchain: Blockchain,
  // The hash of the block.
  hash: string
}

/**
 * Request the latest available rate.
 * Note, there rates are averaged from multiple exchanges and it always a slight delay to fetch the trades.
 * Because of that, when requesting the latest rate, it may fluctuate a little between the requests.
 */
export type GetRatesRequestLatest = Pair[] | { pairs: Pair[] }

/**
 * Reqeust the rates. It can be either the latest available rates, or the rates at the specified moment (timestamp or block).
 */
export type GetRatesRequest = GetRatesRequestLatest | GetRatesRequestAt | GetRatesRequestByBlock;


/**
 * Currency pair with the exchange rate.
 */
export type Rate = {
  base: AnyCurrency;
  target: AnyCurrency;
  /**
   * exchange rate decimal encoded as a string
   */
  rate: string;

  /**
   * Timestamp of the moment when the rate was established.
   * It points to the moment when the last time one of the components of the pair was traded, which affected the rate.
   * It's assumed that if there were no trades between that moment, and the moment of the request then the rate is still valid.
   * I.e., it's the last known evidence of the rate. If multiple pairs requested, the timestamp of each pair may be different.
   */
  timestamp?: Date;
};

export type GetRatesResponse = Rate[];

export class ConvertMarket {
  private readonly factory: MessageFactory;

  private common: ConvertCommon;

  constructor(factory: MessageFactory, common: ConvertCommon = new ConvertCommon(factory)) {
    this.factory = factory;
    this.common = common;
  }

  /**
   * Convert TypeScript type to Protobuf message
   * @param request
   */
  public ratesRequest(request: GetRatesRequest): market_pb.GetRatesRequest {
    const req: market_pb.GetRatesRequest = this.factory('market_pb.GetRatesRequest');

    let pairsList: Pair[];

    if (Array.isArray(request)) {
        pairsList = request;
    } else if ('pairs' in request) {
        pairsList = request.pairs;
    }

    pairsList.forEach((pair) => {
      const pairProto: market_pb.Pair = this.factory('market_pb.Pair');

      if (isErc20Asset(pair.base)) {
        pairProto.setErc20Base(this.common.pbErc20Asset(pair.base));
      } else {
        pairProto.setBase(pair.base);
      }

      if (isErc20Asset(pair.target)) {
        pairProto.setErc20Target(this.common.pbErc20Asset(pair.target));
      } else {
        pairProto.setTarget(pair.target);
      }

      req.addPairs(pairProto);
    });

    if ('timestamp' in request) {
      req.setTimestamp(request.timestamp instanceof Date ? request.timestamp.getTime() : request.timestamp);
    } else if ('block' in request) {
      const blockRef = request.block;
      const blockRefProto: common_pb.BlockRef = this.factory('common_pb.BlockRef');
      blockRefProto.setBlockchain(blockRef.blockchain.valueOf());
      if ('height' in blockRef) {
        blockRefProto.setHeight(blockRef.height);
      } else if ('hash' in blockRef) {
        blockRefProto.setBlockId(blockRef.hash);
      }
      req.setBlock(blockRefProto);
    }

    return req;
  }

  /**
   * Convert Protobuf message to TypeScript type
   */
  public ratesResponse(): DataMapper<market_pb.GetRatesResponse, GetRatesResponse> {
    return (value) => {
      const rates: Rate[] = value.getRatesList().map((rate) => {
        let base: AnyCurrency;

        if (rate.hasErc20Base()) {
          base = this.common.erc20Asset(rate.getErc20Base());
        } else if (rate.hasBase()) {
          base = rate.getBase() as BaseCurrency;
        } else {
          throw new Error('No base currency in rate');
        }

        let target: AnyCurrency;

        if (rate.hasErc20Target()) {
          target = this.common.erc20Asset(rate.getErc20Target());
        } else if (rate.hasTarget()) {
          target = rate.getTarget() as BaseCurrency;
        }

        let timestamp: Date | undefined = undefined;
        if (rate.getTimestamp() > 0) {
          timestamp = new Date(rate.getTimestamp());
        }

        return {
          base: base,
          target: target,
          rate: rate.getRate(),
          timestamp: timestamp,
        }
      });

      return rates;
    };
  }
}

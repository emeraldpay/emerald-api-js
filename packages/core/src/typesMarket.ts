import * as market_pb from './generated/market_pb';
import { DataMapper } from './Publisher';
import { ConvertCommon, Erc20Asset, isErc20Asset } from './typesCommon';
import { MessageFactory } from './typesConvert';

export type CryptoCurrency = 'BTC' | 'GRIN' | 'ETC' | 'ETH';
export type StablecoinCurrency = 'DAI' | 'SAI' | 'USDT';
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
export type TestCurrency = 'MONOPOLY' | 'KOVAN' | 'TEST_BTC';

export type BaseCurrency = CryptoCurrency | StablecoinCurrency | CountryCurrency | TestCurrency;
export type AnyCurrency = BaseCurrency | Erc20Asset;

export type GetRatesRequest = Pair[];

export type Pair = {
  base: AnyCurrency;
  target: AnyCurrency;
};

export type GetRatesResponse = Rate[];

export type Rate = {
  base: AnyCurrency;
  target: AnyCurrency;
  /**
   * exchange rate decimal encoded as a string
   */
  rate: string;
};

export class ConvertMarket {
  private readonly factory: MessageFactory;

  private common: ConvertCommon;

  constructor(factory: MessageFactory, common: ConvertCommon = new ConvertCommon(factory)) {
    this.factory = factory;
    this.common = common;
  }

  public ratesRequest(pairs: GetRatesRequest): market_pb.GetRatesRequest {
    const req: market_pb.GetRatesRequest = this.factory('market_pb.GetRatesRequest');

    pairs.forEach((pair) => {
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
    return req;
  }

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

        let target;

        if (rate.hasErc20Target()) {
          target = this.common.erc20Asset(rate.getErc20Target());
        } else if (rate.hasTarget()) {
          target = rate.getTarget();
        }

        return {
          base: base,
          target: target,
          rate: rate.getRate(),
        } as Rate;
      });

      return rates;
    };
  }
}

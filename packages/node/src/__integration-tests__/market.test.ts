import { Blockchain } from '@emeraldpay/api';
import { EmeraldApi } from '../EmeraldApi';

jest.setTimeout(5000);

describe('MarketClient', () => {
  let api: EmeraldApi;

  beforeAll(() => {
    api = EmeraldApi.devApi();
  });

  test('Get ETH rate', async () => {
    const client = api.market();

    const act = await client.getRates([{ base: 'ETH', target: 'USD' }]);

    expect(act.length).toBe(1);
    expect(act[0].base).toBe('ETH');
    expect(act[0].target).toBe('USD');
    expect(parseFloat(act[0].rate)).toBeGreaterThan(50);
  });

  test('Get BTC rate', async () => {
    const client = api.market();

    const act = await client.getRates([{ base: 'BTC', target: 'USD' }]);

    expect(act.length).toBe(1);
    expect(act[0].base).toBe('BTC');
    expect(act[0].target).toBe('USD');
    expect(parseFloat(act[0].rate)).toBeGreaterThan(5000);
  });

  test('Get multiple rates', async () => {
    const client = api.market();

    const act = await client.getRates([
      { base: 'BTC', target: 'USD' },
      { base: 'BTC', target: 'EUR' },
      { base: 'BTC', target: 'CHF' },
      { base: 'BTC', target: 'USDT' },
      { base: 'BTC', target: 'DAI' },
      { base: 'BTC', target: 'ETH' },
      { base: 'USD', target: 'BTC' },
    ]);

    expect(act.length).toBe(7);
  });

  test('Get Erc20 rate', async () => {
    const client = api.market();

    const act = await client.getRates([
      {
        base: { blockchain: Blockchain.ETHEREUM, contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7' },
        target: 'USD',
      },
    ]);

    // not currently supported by rate service, just check that it doesn't fail
    // to be replaced with proper checks when rate service will support it
    expect(act.length).toBe(0);
    // expect(act.length).toBe(1);
    // expect(act[0].base).toBe({ blockchain: Blockchain.ETHEREUM, contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7"});
    // expect(act[0].target).toBe("USD");
    // expect(parseFloat(act[0].rate)).toBeGreaterThan(0.5);
    // expect(parseFloat(act[0].rate)).toBeLessThan(1.5);
  });
});

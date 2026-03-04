import { EmeraldApi } from "../EmeraldApi";
import { Blockchain } from "@emeraldpay/api";

jest.setTimeout(5000);

describe("MarketClient", () => {
    let api: EmeraldApi;

    beforeAll(() => {
        // ORIGIN is set in jest.config.js
        api = EmeraldApi.devApi();
    });

    test('Get ETH rate', async () => {
        const client = api.market;

        let act = await client.getRates([{base: "ETH", target: "USD"}]);
        console.log("rates", act);
        expect(act.length).toBe(1);
        expect(act[0].base).toBe("ETH");
        expect(act[0].target).toBe("USD");
        expect(parseFloat(act[0].rate)).toBeGreaterThan(50);
    });

    test('Get ETH rate at block 24319623', async () => {
        const client = api.market;

        let act = await client.getRates({
            block: {
                blockchain: Blockchain.ETHEREUM,
                height: 24319623,
            },
            pairs: [{base: "ETH", target: "USD"}],
        });
        console.log("rates", act);

        expect(act.length).toBe(1);
        expect(act[0].base).toBe("ETH");
        expect(act[0].target).toBe("USD");
        expect(parseFloat(act[0].rate)).toBeGreaterThan(2850.0);
        expect(parseFloat(act[0].rate)).toBeLessThan(2950.0);
    });

    test('Get ETH rate at 6 Feb 2026', async () => {
        const client = api.market;

        let act = await client.getRates({
            timestamp: new Date('2026-02-06T12:00:00Z'),
            pairs: [{base: "ETH", target: "USD"}],
        });
        console.log("rates", act);

        expect(act.length).toBe(1);
        expect(act[0].base).toBe("ETH");
        expect(act[0].target).toBe("USD");
        expect(parseFloat(act[0].rate)).toBeGreaterThan(1900.0);
        expect(parseFloat(act[0].rate)).toBeLessThan(2000.0);
    });

    test('Get BTC rate', async () => {
        const client = api.market;

        let act = await client.getRates([{base: "BTC", target: "USD"}]);
        expect(act.length).toBe(1);
        expect(act[0].base).toBe("BTC");
        expect(act[0].target).toBe("USD");
        expect(parseFloat(act[0].rate)).toBeGreaterThan(5000);
    });

    test('Get multiple rates', async () => {
        const client = api.market;

        let act = await client.getRates([
            {base: "BTC", target: "USD"},
            {base: "BTC", target: "EUR"},
            {base: "BTC", target: "CHF"},
            {base: "BTC", target: "USDT"},
            {base: "BTC", target: "DAI"},
            {base: "BTC", target: "ETH"},
            {base: "USD", target: "BTC"},
        ]);
        console.log("rates", act);
        expect(act.length).toBe(7);
    });
});

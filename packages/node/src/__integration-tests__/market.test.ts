import {EmeraldApi} from "../EmeraldApi";
import {GetRatesResponse} from "@emeraldpay/api-client-core";

jest.setTimeout(5000);

describe("MarketClient", () => {
    test('Get ETH rate', async () => {
        const api = new EmeraldApi();
        const client = api.market();

        let act = await client.getRates([{base: "ETH", target: "USD"}]);
        expect(act.length).toBe(1);
        expect(act[0].base).toBe("ETH");
        expect(act[0].target).toBe("USD");
        expect(parseFloat(act[0].rate)).toBeGreaterThan(50);
    });

    test('Get BTC rate', async () => {
        const api = new EmeraldApi();
        const client = api.market();

        let act = await client.getRates([{base: "BTC", target: "USD"}]);
        expect(act.length).toBe(1);
        expect(act[0].base).toBe("BTC");
        expect(act[0].target).toBe("USD");
        expect(parseFloat(act[0].rate)).toBeGreaterThan(5000);
    });

    test('Get multiple rates', async () => {
        const api = new EmeraldApi();
        const client = api.market();

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

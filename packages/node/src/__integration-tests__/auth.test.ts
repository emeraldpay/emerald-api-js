import {Blockchain, AuthDetails, JwtSignature, EmeraldAuthenticator, TokenStatus} from '@emeraldpay/api';
import { emeraldCredentials } from '../credentials';
import { EmeraldApi } from '../EmeraldApi';

jest.setTimeout(30000);

describe('Auth', () => {
  test('auth and get balance', async () => {
    const client = EmeraldApi.devApi().blockchain();

    const balance = await client.getBalance({
      asset: { blockchain: Blockchain.TESTNET_SEPOLIA, code: 'ETHER' },
      address: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
    });

    expect(balance).toBeDefined();
  });

  test('terminate connection after timeout', async () => {
    const client = EmeraldApi.localApi().blockchain();

    try {
      const balance = await client.getBalance({
        asset: { blockchain: Blockchain.ETHEREUM, code: 'ETHER' },
        address: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
      });

      expect(balance).toBeUndefined();
    } catch (exception) {
      expect(exception).toBeDefined();
    }
  });

  test('auth token received once and shared between all clients', async () => {
    const api = EmeraldApi.devApi();

    const blockchainClient = api.blockchain();
    const marketClient = api.market();
    const monitoringClient = api.monitoring();
    const addressClient = api.address();

    const results = await Promise.all([
      blockchainClient.estimateFees({
        blockchain: Blockchain.TESTNET_SEPOLIA,
        blocks: 1,
        mode: 'avgLast',
      }),
      marketClient.getRates([{ base: 'ETH', target: 'USD' }]),
      monitoringClient.ping(),
      addressClient.describeXpub({
        address:
          'vpub5bGr72An7v5pmqBZecLVnd74Kpip5t9GSPX7ULe9LazdvWq1ECkJ' +
          'Tpsf6YGFcD4T1McCvcaVdmuHZoo1qaNsddqREiheeFfzUuJ1vMjLFWE',
        blockchain: Blockchain.TESTNET_BITCOIN,
      }),
    ]);

    expect(results.length).toEqual(4);

    const options = { service_url: '' };

    const blockchainMetadata = await blockchainClient.credentials._getCallCredentials().generateMetadata(options);
    const marketMetadata = await marketClient.credentials._getCallCredentials().generateMetadata(options);
    const monitoringMetadata = await monitoringClient.credentials._getCallCredentials().generateMetadata(options);
    const addressMetadata = await addressClient.credentials._getCallCredentials().generateMetadata(options);

    const [blockchainAuthorization] = blockchainMetadata.get('authorization');
    const [marketAuthorization] = marketMetadata.get('authorization');
    const [monitoringAuthorization] = monitoringMetadata.get('authorization');
    const [addressAuthorization] = addressMetadata.get('authorization');

    expect(blockchainAuthorization).toEqual(marketAuthorization);
    expect(marketAuthorization).toEqual(monitoringAuthorization);
    expect(monitoringAuthorization).toEqual(addressAuthorization);
  });

  test('token awaiting stopped in other clients when first request failed', async () => {
    const credentials = emeraldCredentials('localhost:50051', ['fake-client/0.0.0'], 'emrld_yKb3jXMKRJLUWFzL7wPrktkherocZCBy7W6qZH');

    class FakeAuthentication implements EmeraldAuthenticator {
      authenticate(): Promise<AuthDetails> {
        return new Promise((resolve, reject) => setTimeout(reject, 250));
      }
      refresh(): Promise<AuthDetails> {
        return new Promise((resolve, reject) => setTimeout(reject, 250));
      }
    }

    let tokenStatus: TokenStatus | null = null;

    credentials.setAuthentication(new FakeAuthentication());
    credentials.setListener((...statuses) => ([, tokenStatus] = statuses));

    const api = EmeraldApi.devApi(credentials.getChannelCredentials());

    const blockchainClient = api.blockchain();
    const marketClient = api.market();
    const monitoringClient = api.monitoring();
    const addressClient = api.address();

    try {
      const results = await Promise.all([
        blockchainClient.estimateFees({
          blockchain: Blockchain.TESTNET_GOERLI,
          blocks: 1,
          mode: 'avgLast',
        }),
        marketClient.getRates([{ base: 'ETH', target: 'USD' }]),
        monitoringClient.ping(),
        addressClient.describeXpub({
          address:
            'vpub5bGr72An7v5pmqBZecLVnd74Kpip5t9GSPX7ULe9LazdvWq1ECkJ' +
            'Tpsf6YGFcD4T1McCvcaVdmuHZoo1qaNsddqREiheeFfzUuJ1vMjLFWE',
          blockchain: Blockchain.TESTNET_BITCOIN,
        }),
      ]);

      expect(results.length).toEqual(0);
    } catch (exception) {
      expect(exception).toBeDefined();

      expect(tokenStatus).toEqual(TokenStatus.ERROR);
    }
  });

  test('cals a refresh', async () => {
    let calls = ["start"];

    const credentials = emeraldCredentials('localhost:50051', ['fake-client/0.0.0'], 'emrld_yKb3jXMKRJLUWFzL7wPrktkherocZCBy7W6qZH');
    class FakeAuthentication implements EmeraldAuthenticator {
      authenticate(): Promise<AuthDetails> {
        calls.push("auth");
        return Promise.resolve(new JwtSignature("test-initial-jwt", new Date()));
      }
      refresh(): Promise<AuthDetails> {
        calls.push("refresh");
        return Promise.resolve(new JwtSignature("test-refreshed-jwt", new Date()));
      }
    }
    credentials.setAuthentication(new FakeAuthentication());

    const meta1 = await credentials.getChannelCredentials()._getCallCredentials()
        .generateMetadata({service_url: "test"})
    const meta2 = await credentials.getChannelCredentials()._getCallCredentials()
        .generateMetadata({service_url: "test"})

    // make sure it doesn't make initial request twice
    expect(calls).toEqual(["start", "auth", "refresh"]);

    // make sure it uses received jwts
    expect(meta1.get("authorization")).toEqual(["Bearer test-initial-jwt"]);
    expect(meta2.get("authorization")).toEqual(["Bearer test-refreshed-jwt"]);
  })


});

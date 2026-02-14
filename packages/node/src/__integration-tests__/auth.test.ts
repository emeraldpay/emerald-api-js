import {
  Blockchain, AuthDetails, JwtSignature, EmeraldAuthenticator, TokenStatus, isSecretToken,
  StandardSigner, CredentialsClient, AuthRequest, AuthResponse, RefreshRequest, Headers,
} from '@emeraldpay/api';
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

  test('auth with temp token', async () => {
    const client = EmeraldApi.devApi().auth();

    const token = await client.issueToken({
        type: 'temp',
    });

    expect(token).toBeDefined();
    expect(token.secret).toBeDefined();
    expect(token.expiresAt).toBeDefined();
    expect(isSecretToken(token.secret)).toBeTruthy();

    const client2 = EmeraldApi.devApi(token.secret).auth();

    const me = await client2.whoIAm();
    expect(me.authenticated).toBeTruthy();
  });

  test('is authenticated', async () => {
    const client = EmeraldApi.devApi().auth();

    const resp = await client.whoIAm()

    expect(resp.authenticated).toBeTruthy();
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

    // All clients must share the exact same ChannelCredentials instance,
    // which ensures they share the same JWT and auth state
    expect(blockchainClient.credentials).toBe(marketClient.credentials);
    expect(marketClient.credentials).toBe(monitoringClient.credentials);
    expect(monitoringClient.credentials).toBe(addressClient.credentials);

    // Verify the shared credentials actually work by making API calls through different clients
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

    const api = EmeraldApi.devApi(null, credentials.getChannelCredentials());

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

  test('calls a refresh', async () => {
    const calls = ["start"];

    // A no-op credentials client; we override the authentication provider below so this is never called
    const noopClient: CredentialsClient = {
      authenticate(_req: AuthRequest): Promise<AuthResponse> { return Promise.reject(new Error('should not be called')); },
      refresh(_req: RefreshRequest): Promise<AuthResponse> { return Promise.reject(new Error('should not be called')); },
    };

    class FakeAuthentication implements EmeraldAuthenticator {
      authenticate(): Promise<AuthDetails> {
        calls.push("auth");
        // Return an already-expired JWT so the next getAuth() triggers a refresh
        return Promise.resolve(new JwtSignature("test-initial-jwt", new Date()));
      }
      refresh(): Promise<AuthDetails> {
        calls.push("refresh");
        return Promise.resolve(new JwtSignature("test-refreshed-jwt", new Date()));
      }
    }

    const signer = new StandardSigner(noopClient, 'emrld_yKb3jXMKRJLUWFzL7wPrktkherocZCBy7W6qZH', ['fake-client/0.0.0']);
    signer.setAuthentication(new FakeAuthentication());

    const auth1 = await signer.getAuth();
    const auth2 = await signer.getAuth();

    // Make sure it authenticates first and then refreshes (not authenticates twice)
    expect(calls).toEqual(["start", "auth", "refresh"]);

    // Verify the JWTs returned by each call
    const headers1: Record<string, string> = {};
    auth1.applyAuth({ add: (key: string, value: string) => { headers1[key] = value; } });

    const headers2: Record<string, string> = {};
    auth2.applyAuth({ add: (key: string, value: string) => { headers2[key] = value; } });

    expect(headers1['Authorization']).toEqual("Bearer test-initial-jwt");
    expect(headers2['Authorization']).toEqual("Bearer test-refreshed-jwt");
  })


});

import {SecretToken} from "@emeraldpay/api";
import {ChannelCredentials} from '@grpc/grpc-js';
import {emeraldCredentials} from './credentials';
import {AddressClient} from './wrapped/AddressClient';
import {AuthClient} from "./wrapped/Auth";
import {BlockchainClient} from './wrapped/BlockchainClient';
import {MarketClient} from './wrapped/MarketClient';
import {MonitoringClient} from './wrapped/MonitoringClient';
import {SierraProjectClient} from "./wrapped/SierraProjectClient";
import {TokenClient} from './wrapped/TokenClient';
import {TransactionClient} from './wrapped/TransactionClient';

export class EmeraldApi {
  private readonly agents: string[] = ['test-client/0.0.0'];

  private readonly hostname: string;
  private readonly credentials: ChannelCredentials;

  constructor(hostname: string, token: SecretToken, credentials?: ChannelCredentials) {
    this.credentials = credentials ?? emeraldCredentials(hostname, this.agents, token).getChannelCredentials();
    this.hostname = hostname;
  }

  static devApi(token?: SecretToken | undefined, credentials?: ChannelCredentials): EmeraldApi {
    // a dev token with access only from the internal network
    // Token ID: 893b95a0-d28c-49b9-b1b1-6c63e2081d7e
    // User ID: bada55a1-0000-4000-a000-000000000000
    const devToken = token ?? 'emrld_pbhT80xj0hsnFf73uOVJ6LEmenaVcbsXO7pGwH';
    return new EmeraldApi('api.emeraldpay.dev:443', devToken, credentials);
  }

  static localApi(port = 50051, credentials?: ChannelCredentials): EmeraldApi {
    // just a random token, doesn't exist
    const noToken = 'emrld_yKb3jXMKRJLUWFzL7wPrktkherocZCBy7W6qZH';
    return new EmeraldApi(`localhost:${port}`, noToken, credentials);
  }

  static productionApi(token: SecretToken): EmeraldApi {
    return new EmeraldApi('api.emrld.io:443', token);
  }

  address(): AddressClient {
    return new AddressClient(this.hostname, this.credentials, this.agents);
  }

  blockchain(): BlockchainClient {
    return new BlockchainClient(this.hostname, this.credentials, this.agents);
  }

  market(): MarketClient {
    return new MarketClient(this.hostname, this.credentials, this.agents);
  }

  monitoring(): MonitoringClient {
    return new MonitoringClient(this.hostname, this.credentials, this.agents);
  }

  token(): TokenClient {
    return new TokenClient(this.hostname, this.credentials, this.agents);
  }

  transaction(): TransactionClient {
    return new TransactionClient(this.hostname, this.credentials, this.agents);
  }

  auth(): AuthClient {
    return new AuthClient(this.hostname, this.credentials, this.agents);
  }

  sierraProject(): SierraProjectClient {
    return new SierraProjectClient(this.hostname, this.credentials, this.agents);
  }

}

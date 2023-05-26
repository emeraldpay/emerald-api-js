import { CredentialsContext, emeraldCredentials } from './credentials';
import { BlockchainClient } from './wrapped/BlockchainClient';
import { MarketClient } from './wrapped/MarketClient';
import { MonitoringClient } from './wrapped/MonitoringClient';
import { TransactionClient } from './wrapped/TransactionClient';

export class EmeraldApi {
  private readonly agent: string[] = ['test/0.0.0'];

  private readonly hostname: string;
  private readonly credentials: CredentialsContext;

  constructor(hostname: string) {
    this.credentials = emeraldCredentials(hostname, this.agent, 'test');
    this.hostname = hostname;
  }

  static defaultApi(): EmeraldApi {
    return new EmeraldApi('api.emrld.io:443');
  }

  static devApi(): EmeraldApi {
    return new EmeraldApi('api.emeraldpay.dev:443');
  }

  static fakeApi(): EmeraldApi {
    return new EmeraldApi('localhost:0');
  }

  blockchain(): BlockchainClient {
    return new BlockchainClient(this.hostname, this.credentials.getChannelCredentials(), this.agent);
  }

  monitoring(): MonitoringClient {
    return new MonitoringClient(this.hostname, this.credentials.getChannelCredentials(), this.agent);
  }

  market(): MarketClient {
    return new MarketClient(this.hostname, this.credentials.getChannelCredentials(), this.agent);
  }

  transaction(): TransactionClient {
    return new TransactionClient(this.hostname, this.credentials.getChannelCredentials(), this.agent);
  }
}

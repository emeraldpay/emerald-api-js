import { ChannelCredentials } from '@grpc/grpc-js';
import { emeraldCredentials } from './credentials';
import { BlockchainClient } from './wrapped/BlockchainClient';
import { MarketClient } from './wrapped/MarketClient';
import { MonitoringClient } from './wrapped/MonitoringClient';
import { TransactionClient } from './wrapped/TransactionClient';

export class EmeraldApi {
  private readonly agents: string[] = ['test-client/0.0.0'];

  private readonly hostname: string;
  private readonly credentials: ChannelCredentials;

  constructor(hostname: string, credentials?: ChannelCredentials) {
    this.credentials = credentials ?? emeraldCredentials(hostname, this.agents, 'test-client').getChannelCredentials();
    this.hostname = hostname;
  }

  static devApi(credentials?: ChannelCredentials): EmeraldApi {
    return new EmeraldApi('api.emeraldpay.dev:443', credentials);
  }

  static localApi(port = 50051, credentials?: ChannelCredentials): EmeraldApi {
    return new EmeraldApi(`localhost:${port}`, credentials);
  }

  static productionApi(): EmeraldApi {
    return new EmeraldApi('api.emrld.io:443');
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

  transaction(): TransactionClient {
    return new TransactionClient(this.hostname, this.credentials, this.agents);
  }
}

import {ConnectionListener, Publisher, publishToPromise, readOnce, sierra} from '@emeraldpay/api';
import {ChannelCredentials} from '@grpc/grpc-js';
import {NativeChannel, callSingle, callStream} from '../channel';
import {BillingClient} from '../generated/sierra_grpc_pb';
import {classFactory} from './Factory';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: clientVersion } = require('../../package.json');

/**
 * Billing of a project, as seen by a customer.
 */
export class SierraBillingClient {
  readonly client: BillingClient;
  readonly channel: NativeChannel;
  readonly credentials: ChannelCredentials;
  readonly retries: number;

  private readonly convert: sierra.ConvertSierra = new sierra.ConvertSierra(classFactory);

  constructor(address: string, credentials: ChannelCredentials, agents: string[], retries = 3) {
    const agent = [...agents, `emerald-client-node/${clientVersion}`].join(' ');

    this.client = new BillingClient(address, credentials, { 'grpc.primary_user_agent': agent });
    this.channel = new NativeChannel(this.client);
    this.credentials = credentials;
    this.retries = retries;
  }

  public setConnectionListener(listener: ConnectionListener): void {
    this.channel.setListener(listener);
  }

  /**
   * What the project costs over time, one series per project, or split by method or component when a breakdown is requested.
   * A recent cost may change until its hour is settled.
   */
  public getCosts(request: sierra.GetCostsRequest): Publisher<sierra.CostSeries> {
    const req = this.convert.getCostsRequest(request);
    const mapper = this.convert.costSeries();

    const call = callStream(this.client.getCosts.bind(this.client), mapper);
    return readOnce(this.channel, call, req, this.retries);
  }

  /**
   * The terms of the organization, which apply to every project of it, such as the current discount.
   */
  public getOrgBilling(request: sierra.GetOrgBillingRequest): Promise<sierra.OrgBilling> {
    const req = this.convert.getOrgBillingRequest(request);
    const mapper = this.convert.orgBilling();

    const call = callSingle(this.client.getOrgBilling.bind(this.client), mapper);
    return publishToPromise(readOnce(this.channel, call, req, this.retries));
  }

  /**
   * The terms of the project, such as its currency and daily budget.
   */
  public getProjectBilling(request: sierra.GetProjectBillingRequest): Promise<sierra.ProjectBilling> {
    const req = this.convert.getProjectBillingRequest(request);
    const mapper = this.convert.projectBilling();

    const call = callSingle(this.client.getProjectBilling.bind(this.client), mapper);
    return publishToPromise(readOnce(this.channel, call, req, this.retries));
  }

  /**
   * The current balance of the project: the sum of its ledger, and the moment up to which the usage is charged into it.
   */
  public getBalance(request: sierra.GetBalanceRequest): Promise<sierra.Balance> {
    const req = this.convert.getBalanceRequest(request);
    const mapper = this.convert.balance();

    const call = callSingle(this.client.getBalance.bind(this.client), mapper);
    return publishToPromise(readOnce(this.channel, call, req, this.retries));
  }

  /**
   * The account of the project day by day: what was charged, adjusted and paid, and the balance at the end of each UTC day.
   */
  public getAccountHistory(request: sierra.GetAccountHistoryRequest): Publisher<sierra.AccountHistoryDay> {
    const req = this.convert.getAccountHistoryRequest(request);
    const mapper = this.convert.accountHistoryDay();

    const call = callStream(this.client.getAccountHistory.bind(this.client), mapper);
    return readOnce(this.channel, call, req, this.retries);
  }
}

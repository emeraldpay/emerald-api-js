import {Publisher, publishToPromise, readOnce, sierra} from "@emeraldpay/api";
import {WebChannel, callPromise, callStream} from "../channel";
import {CredentialsContext} from "../credentials";
import * as sierra_rpc from '../generated/SierraServiceClientPb';
import {classFactory} from "./Factory";

/**
 * Billing of a project, as seen by a customer.
 */
export class SierraBillingClient {
    readonly client: sierra_rpc.BillingClient;
    readonly channel: WebChannel;
    readonly retries: number;

    private readonly convert = new sierra.ConvertSierra(classFactory);

    constructor(hostname: string, channel: WebChannel, credentials: CredentialsContext, retries = 3) {
        this.client = new sierra_rpc.BillingClient(hostname, null, credentials.options);
        this.channel = channel;
        this.retries = retries;
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

        const call = callPromise(this.client.getOrgBilling.bind(this.client), mapper);
        return publishToPromise(readOnce(this.channel, call, req, this.retries));
    }

    /**
     * The terms of the project, such as its currency and daily budget.
     */
    public getProjectBilling(request: sierra.GetProjectBillingRequest): Promise<sierra.ProjectBilling> {
        const req = this.convert.getProjectBillingRequest(request);
        const mapper = this.convert.projectBilling();

        const call = callPromise(this.client.getProjectBilling.bind(this.client), mapper);
        return publishToPromise(readOnce(this.channel, call, req, this.retries));
    }

    /**
     * The current balance of the project: the sum of its ledger, and the moment up to which the usage is charged into it.
     */
    public getBalance(request: sierra.GetBalanceRequest): Promise<sierra.Balance> {
        const req = this.convert.getBalanceRequest(request);
        const mapper = this.convert.balance();

        const call = callPromise(this.client.getBalance.bind(this.client), mapper);
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

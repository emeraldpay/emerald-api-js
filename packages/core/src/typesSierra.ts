import * as sierra_message_pb from './generated/sierra.message_pb';
import { DataMapper } from './Publisher';
import { UUID } from "./typesCommon";
import { MessageFactory } from './typesConvert';

export interface Project {
  orgId: UUID;
  projectId: UUID;
  name: string;
  description: string;
  createdAt: Date;
}

export interface Org {
  orgId: UUID;
  name: UUID;
  description: string;
  createdAt: Date;
}

export interface CreateProjectRequest {
  orgId: UUID;
  name: string;
  description: string;
}

export interface CreateProjectResponse {
  projectId: UUID;
}

export interface ListProjectsRequest {
  orgId: UUID;
}

export interface GetOrgRequest {
  orgId: UUID;
}

export enum Granularity {
  UNSPECIFIED = 0,
  SECOND = 1,
  MINUTE = 2,
  HOUR = 3,
  DAY = 4,
  WEEK = 5,
  MONTH = 6,
  FIVE_MINUTES = 7,
  FIFTEEN_MINUTES = 8,
}

export enum GroupBy {
  UNSPECIFIED = 0,
  SERVICE = 1,
  PROJECT = 2,
}

export interface GetRequestCountRequest {
  orgId: UUID;
  timestampFrom?: Date;
  timestampTo?: Date;
  projectIds?: UUID[];
  services?: string[];
  granularity?: Granularity;
  groupBy?: GroupBy;
}

export interface RequestCount {
  timestamp: Date;
  count: number;
}

export interface GroupService {
  service: string;
}

export interface GroupProjectId {
  projectId: UUID;
}

export interface GroupRequestCount {
  group: GroupService | GroupProjectId;
  counts: RequestCount[];
}

export interface GetTokenStatRequest {
  orgId: UUID;
  tokenIds?: UUID[];
}

export interface TokenStat {
  tokenId: UUID;
  lastTimestamp: Date;
}

/**
 * Filter for a subscription to the request logs.
 */
export interface GetLogsRequest {
  /**
   * Organization to get logs for.
   */
  orgId: UUID;
  /**
   * Project filter. Not set means all the projects in the organization.
   */
  projectId?: UUID;
  /**
   * Token filter. Not set means all the tokens. When set, the `projectId` is required.
   */
  tokenId?: UUID;
  /**
   * Service filter, as a full method name (ex. `emerald.blockchain/NativeCall`) or a namespace (ex. `emerald.blockchain`).
   * Not set means all the services.
   */
  service?: string;
}

/**
 * Status of a response sent by the server for a logged request.
 */
export enum LogStatus {
  OK = 0,
  DENIED = 1,
  ERROR = 2,
}

/**
 * Sent at the beginning of a request, with the basic info about the request.
 */
export interface LogPartStart {
  type: 'start';
  orgId: UUID;
  projectId: UUID;
  tokenId: UUID;
  /**
   * Full service name, ex. `emerald.blockchain/NativeCall`
   */
  service: string;
}

/**
 * Sent when the server sends a response message for the request.
 */
export interface LogPartMessage {
  type: 'message';
  status: LogStatus;
  /**
   * Human-readable error description, set only when the status is an error.
   */
  errorMessage?: string;
  /**
   * Size of the response in bytes.
   */
  responseSize: number;
}

/**
 * Sent when the request is finished.
 */
export interface LogPartClose {
  type: 'close';
  /**
   * Total time of the request in milliseconds.
   */
  totalTime: number;
  /**
   * Number of messages sent by the server for this request (not counting the start and close parts).
   * May be zero if the request was dropped before processing.
   */
  messageCount: number;
  /**
   * Total size of the request in bytes.
   */
  requestSize: number;
}

export type LogPart = LogPartStart | LogPartMessage | LogPartClose;

/**
 * A single event of a request log. A request typically produces `start -> message* -> close` events
 * sharing the same `requestId`, though some of them may be dropped when the request volume is high.
 */
export interface LogResponse {
  requestId: string;
  /**
   * Time when the event happened on the server.
   */
  timestamp: Date;
  part: LogPart;
}

/**
 * How a cost series is split. Every series always belongs to a single project.
 */
export enum CostBreakdown {
  /**
   * One series per project.
   */
  UNSPECIFIED = 0,
  /**
   * One series per project and method.
   */
  METHOD = 1,
  /**
   * One series per project, method and measurement, which is the level a price is set at.
   */
  COMPONENT = 2,
}

/**
 * The granularity accepted for the costs. Anything finer than an hour is rejected by the server with
 * `INVALID_ARGUMENT`, because an hour is the smallest period a charge exists for.
 */
export type CostGranularity = Granularity.HOUR | Granularity.DAY | Granularity.MONTH;

/**
 * Request for the costs of a project over time.
 * The costs are based on the latest rating of each hour, so a recent cost may change until its hour is settled.
 */
export interface GetCostsRequest {
  orgId: UUID;
  projectId: UUID;
  /**
   * Beginning of the period, inclusive. Rounded down to the hour by the server.
   */
  timestampFrom: Date;
  /**
   * End of the period, exclusive. Rounded up to the hour by the server. Not set means now.
   */
  timestampTo?: Date;
  /**
   * Size of each period in the series.
   */
  granularity: CostGranularity;
  /**
   * How to split the series. Not set means one series per project.
   */
  breakdown?: CostBreakdown;
}

/**
 * Cost of a single period of a series.
 */
export interface Cost {
  /**
   * Beginning of the period.
   */
  timestamp: Date;
  /**
   * The priced quantity. Set only for a series broken down by `COMPONENT` (i.e., the series has a `measurement`).
   */
  quantity?: number;
  /**
   * What the project is charged for the period, in the currency of the series.
   * It's the list price at the organization's rate and the currency's exchange rate. For a settled hour these
   * are the rates it was settled at, and for an hour not settled yet, the rates in effect now.
   *
   * NOTE: It's a floating point value intended for display, the exact figures are kept by the accounting.
   */
  amount: number;
}

/**
 * Costs of a project over time, split further when a breakdown is requested.
 */
export interface CostSeries {
  projectId: UUID;
  /**
   * ISO 4217 currency of every `amount` in the series, which is the project's currency. Ex. `USD`.
   */
  currency: string;
  /**
   * The method of the series. Set when the breakdown is `METHOD` or `COMPONENT`.
   */
  method?: string;
  /**
   * The measurement of the series, ex. `response` or `usage:rates`. Set when the breakdown is `COMPONENT`.
   */
  measurement?: string;
  /**
   * One per period of the requested granularity, in order, including the periods with zero cost.
   */
  costs: Cost[];
}

export interface GetOrgBillingRequest {
  orgId: UUID;
}

/**
 * The rate an organization is charged at now.
 */
export interface Discount {
  /**
   * The fraction of the list price paid: `0.8` is twenty percent off, `0` is free of charge.
   */
  rate: number;
  /**
   * When the discount ends. Not set means it has no end.
   */
  expiresAt?: Date;
}

export interface PostalAddress {
  lines: string[];
  city?: string;
  region?: string;
  postalCode?: string;
  /**
   * ISO 3166-1 alpha-2 country code, ex. `US`.
   */
  country?: string;
}

/**
 * Who is invoiced, and where the documents go.
 */
export interface BillingDetails {
  /**
   * The name the documents are issued to.
   */
  legalName?: string;
  /**
   * Where the documents are sent.
   */
  email?: string;
  address?: PostalAddress;
  /**
   * VAT or an equivalent, as the tax authority spells it.
   */
  taxId?: string;
}

/**
 * The terms of an organization. What is agreed with the customer applies to every project of it.
 */
export interface OrgBilling {
  orgId: UUID;
  /**
   * The discount in effect now. Not set means the full price.
   */
  discount?: Discount;
  /**
   * NOTE: not implemented on the server yet, so it's never set for now.
   */
  details?: BillingDetails;
}

export interface GetProjectBillingRequest {
  orgId: UUID;
  projectId: UUID;
}

/**
 * The terms of a project.
 */
export interface ProjectBilling {
  projectId: UUID;
  orgId: UUID;
  /**
   * ISO 4217 currency the project is charged and paid in, ex. `USD`. It's set when the project is created and never changes.
   */
  currency: string;
  /**
   * The most the project may spend in a UTC day, in USD at list price, before it's disabled until the day ends.
   * Not set means no budget.
   */
  dailyBudgetUsd?: number;
}

/**
 * A sum of money.
 */
export interface Money {
  /**
   * Negative is what the project owes or was charged.
   *
   * NOTE: It's a floating point value intended for display, the exact figures are kept by the accounting.
   */
  amount: number;
  /**
   * ISO 4217 currency code, ex. `USD`.
   */
  currency: string;
}

export interface GetBalanceRequest {
  orgId: UUID;
  projectId: UUID;
}

/**
 * The balance of a project.
 */
export interface Balance {
  projectId: UUID;
  /**
   * The sum of the ledger: what was paid minus what was charged, in the project's currency.
   * Negative means the project owes.
   *
   * It's recalculated as new usage data comes in, and may be amended later even for the same `settledThrough`.
   * In rare cases late data may take up to 72 hours to be included.
   */
  settled: Money;
  /**
   * The hour up to which all the usage is charged into `settled`. The usage after it is not included.
   */
  settledThrough: Date;
  /**
   * When the balance was last updated. Not set when the server doesn't provide it.
   */
  updatedAt?: Date;
}

/**
 * Request for the account history of a project, one item per UTC day.
 */
export interface GetAccountHistoryRequest {
  orgId: UUID;
  projectId: UUID;
  /**
   * Beginning of the period, inclusive. Rounded down to the UTC day by the server.
   */
  timestampFrom: Date;
  /**
   * End of the period, exclusive. Rounded up to the UTC day by the server. Not set means now.
   */
  timestampTo?: Date;
}

/**
 * One day of a project's account: what it was charged, what it paid, and the balance at the end of the day.
 *
 * Amounts are counted on the day the money moved, so a correction of an earlier hour counts on the day it was posted.
 * Days when nothing happened are included, with zero amounts.
 */
export interface AccountHistoryDay {
  /**
   * Start of the UTC day.
   */
  timestamp: Date;
  /**
   * Usage charged that day, including corrections of earlier hours.
   */
  charged: Money;
  /**
   * Money moved by an operator that day, can be either sign.
   */
  adjusted: Money;
  /**
   * Payments credited that day, zero or positive.
   */
  paid: Money;
  /**
   * The balance at the end of the day, in the project's currency.
   */
  balance: Money;
}

export function isLogPartStart(part: LogPart): part is LogPartStart {
  return part.type === 'start';
}

export function isLogPartMessage(part: LogPart): part is LogPartMessage {
  return part.type === 'message';
}

export function isLogPartClose(part: LogPart): part is LogPartClose {
  return part.type === 'close';
}

export class ConvertSierra {
  private readonly factory: MessageFactory;

  constructor(factory: MessageFactory) {
    this.factory = factory;
  }

  public createProjectRequest(request: CreateProjectRequest): sierra_message_pb.CreateProjectRequest {
    const result: sierra_message_pb.CreateProjectRequest = this.factory('sierra_message_pb.CreateProjectRequest');
    result.setOrgId(request.orgId);
    result.setName(request.name);
    result.setDescription(request.description);
    return result;
  }

  public listProjectsRequest(request: ListProjectsRequest): sierra_message_pb.ListProjectsRequest {
    const result: sierra_message_pb.ListProjectsRequest = this.factory('sierra_message_pb.ListProjectsRequest');
    result.setOrgId(request.orgId);
    return result;
  }

  public getOrgRequest(request: GetOrgRequest): sierra_message_pb.GetOrgRequest {
    const result: sierra_message_pb.GetOrgRequest = this.factory('sierra_message_pb.GetOrgRequest');
    result.setOrgId(request.orgId);
    return result;
  }

  public getRequestCountRequest(request: GetRequestCountRequest): sierra_message_pb.GetRequestCountRequest {
    const result: sierra_message_pb.GetRequestCountRequest = this.factory('sierra_message_pb.GetRequestCountRequest');
    result.setOrgId(request.orgId)
    if (request.timestampFrom) {
      result.setTimestampFrom(request.timestampFrom.getTime());
    }
    if (request.timestampTo) {
      result.setTimestampTo(request.timestampTo.getTime())
    }
    if (request.projectIds) {
      result.setProjectIdsList(request.projectIds)
    }
    if (request.services) {
      result.setServicesList(request.services)
    }
    if (request.granularity) {
      result.setGranularity(request.granularity.valueOf())
    }
    if (request.groupBy) {
      result.setGroupBy(request.groupBy.valueOf());
    }
    return result;
  }

  public project(): DataMapper<sierra_message_pb.Project, Project> {
    return (response) => ({
      orgId: response.getOrgId(),
      projectId: response.getProjectId(),
      name: response.getName(),
      description: response.getDescription(),
      createdAt: new Date(response.getCreatedAt()),
    });
  }

  public org(): DataMapper<sierra_message_pb.Org, Org> {
    return (response) => ({
      orgId: response.getOrgId(),
      name: response.getName(),
      description: response.getDescription(),
      createdAt: new Date(response.getCreatedAt()),
    });
  }

  public requestCount(): DataMapper<sierra_message_pb.RequestCount, RequestCount> {
    return (response) => ({
      timestamp: new Date(response.getTimestamp()),
      count: response.getCount(),
    });
  }

  public groupRequestCount(): DataMapper<sierra_message_pb.GroupRequestCount, GroupRequestCount> {
    return (response) => {
      let group: GroupService | GroupProjectId;
      if (response.hasService()) {
        group = {
          service: response.getService(),
        };
      } else if (response.hasProjectId()) {
        group = {
          projectId: response.getProjectId(),
        };
      } else {
        throw new Error('No group in request count');
      }
      return {
        group: group,
        counts: response.getCountsList().map(this.requestCount()),
      };
    };
  }

  public getTokenStatRequest(request: GetTokenStatRequest): sierra_message_pb.GetTokenStatRequest {
    const result: sierra_message_pb.GetTokenStatRequest = this.factory('sierra_message_pb.GetTokenStatRequest');
    result.setOrgId(request.orgId);
    if (request.tokenIds) {
      result.setTokenIdsList(request.tokenIds);
    }
    return result;
  }

  public tokenStat(): DataMapper<sierra_message_pb.TokenStat, TokenStat> {
    return (response) => {
      return {
        tokenId: response.getTokenId(),
        lastTimestamp: new Date(response.getLastTimestamp()),
      };
    };
  }

  public getLogsRequest(request: GetLogsRequest): sierra_message_pb.GetLogsRequest {
    const result: sierra_message_pb.GetLogsRequest = this.factory('sierra_message_pb.GetLogsRequest');
    result.setOrgId(request.orgId);
    if (request.projectId) {
      result.setProjectId(request.projectId);
    }
    if (request.tokenId) {
      result.setTokenId(request.tokenId);
    }
    if (request.service) {
      result.setService(request.service);
    }
    return result;
  }

  public logPart(): DataMapper<sierra_message_pb.LogResponsePart, LogPart> {
    return (response) => {
      const start = response.getStart();
      if (start) {
        return {
          type: 'start',
          orgId: start.getOrgId(),
          projectId: start.getProjectId(),
          tokenId: start.getTokenId(),
          service: start.getService(),
        };
      }
      const message = response.getMessage();
      if (message) {
        const result: LogPartMessage = {
          type: 'message',
          status: message.getStatus().valueOf(),
          responseSize: message.getResponseSize(),
        };
        if (message.hasErrorMessage()) {
          result.errorMessage = message.getErrorMessage();
        }
        return result;
      }
      const close = response.getClose();
      if (close) {
        return {
          type: 'close',
          totalTime: close.getTotalTime(),
          messageCount: close.getMessageCount(),
          requestSize: close.getRequestSize(),
        };
      }
      throw new Error('No kind in log part');
    };
  }

  public logResponse(): DataMapper<sierra_message_pb.LogResponse, LogResponse> {
    return (response) => {
      const part = response.getPart();
      if (!part) {
        throw new Error('No part in log response');
      }
      return {
        requestId: response.getRequestId(),
        timestamp: new Date(response.getTimestamp()),
        part: this.logPart()(part),
      };
    };
  }

  public getCostsRequest(request: GetCostsRequest): sierra_message_pb.GetCostsRequest {
    const result: sierra_message_pb.GetCostsRequest = this.factory('sierra_message_pb.GetCostsRequest');
    result.setOrgId(request.orgId);
    result.setProjectId(request.projectId);
    result.setTimestampFrom(request.timestampFrom.getTime());
    if (request.timestampTo) {
      result.setTimestampTo(request.timestampTo.getTime());
    }
    result.setGranularity(request.granularity.valueOf());
    if (request.breakdown) {
      result.setBreakdown(request.breakdown.valueOf());
    }
    return result;
  }

  /**
   * @param withQuantity `true` for a series that has a quantity in its costs, i.e. the one broken down by component.
   *  The quantity cannot be checked on the cost itself, because zero is a valid quantity.
   */
  public cost(withQuantity: boolean): DataMapper<sierra_message_pb.Cost, Cost> {
    return (response) => {
      const result: Cost = {
        timestamp: new Date(response.getTimestamp()),
        amount: response.getAmount(),
      };
      if (withQuantity) {
        result.quantity = response.getQuantity();
      }
      return result;
    };
  }

  public costSeries(): DataMapper<sierra_message_pb.CostSeries, CostSeries> {
    return (response) => {
      // proto3 strings have no presence, so an empty string means the field is not set
      const method = response.getMethod();
      const measurement = response.getMeasurement();
      const result: CostSeries = {
        projectId: response.getProjectId(),
        currency: response.getCurrency(),
        costs: response.getCostsList().map(this.cost(measurement.length > 0)),
      };
      if (method.length > 0) {
        result.method = method;
      }
      if (measurement.length > 0) {
        result.measurement = measurement;
      }
      return result;
    };
  }

  public getOrgBillingRequest(request: GetOrgBillingRequest): sierra_message_pb.GetOrgBillingRequest {
    const result: sierra_message_pb.GetOrgBillingRequest = this.factory('sierra_message_pb.GetOrgBillingRequest');
    result.setOrgId(request.orgId);
    return result;
  }

  public discount(): DataMapper<sierra_message_pb.Discount, Discount> {
    return (response) => {
      const result: Discount = {
        rate: response.getRate(),
      };
      const expiresAt = response.getExpiresAt();
      // zero means no end
      if (expiresAt > 0) {
        result.expiresAt = new Date(expiresAt);
      }
      return result;
    };
  }

  public postalAddress(): DataMapper<sierra_message_pb.PostalAddress, PostalAddress> {
    return (response) => {
      const result: PostalAddress = {
        lines: response.getLinesList(),
      };
      setIfNotEmpty(result, 'city', response.getCity());
      setIfNotEmpty(result, 'region', response.getRegion());
      setIfNotEmpty(result, 'postalCode', response.getPostalCode());
      setIfNotEmpty(result, 'country', response.getCountry());
      return result;
    };
  }

  public billingDetails(): DataMapper<sierra_message_pb.BillingDetails, BillingDetails> {
    return (response) => {
      const result: BillingDetails = {};
      setIfNotEmpty(result, 'legalName', response.getLegalName());
      setIfNotEmpty(result, 'email', response.getEmail());
      const address = response.getAddress();
      if (address) {
        result.address = this.postalAddress()(address);
      }
      setIfNotEmpty(result, 'taxId', response.getTaxId());
      return result;
    };
  }

  public orgBilling(): DataMapper<sierra_message_pb.OrgBilling, OrgBilling> {
    return (response) => {
      const result: OrgBilling = {
        orgId: response.getOrgId(),
      };
      const discount = response.getDiscount();
      if (discount) {
        result.discount = this.discount()(discount);
      }
      const details = response.getDetails();
      if (details) {
        result.details = this.billingDetails()(details);
      }
      return result;
    };
  }

  public getProjectBillingRequest(request: GetProjectBillingRequest): sierra_message_pb.GetProjectBillingRequest {
    const result: sierra_message_pb.GetProjectBillingRequest = this.factory('sierra_message_pb.GetProjectBillingRequest');
    result.setOrgId(request.orgId);
    result.setProjectId(request.projectId);
    return result;
  }

  public projectBilling(): DataMapper<sierra_message_pb.ProjectBilling, ProjectBilling> {
    return (response) => {
      const result: ProjectBilling = {
        projectId: response.getProjectId(),
        orgId: response.getOrgId(),
        currency: response.getCurrency(),
      };
      // an `optional` field, so zero is a valid budget, and only an absent one means no budget
      if (response.hasDailyBudgetUsd()) {
        result.dailyBudgetUsd = response.getDailyBudgetUsd();
      }
      return result;
    };
  }

  public money(): DataMapper<sierra_message_pb.Money, Money> {
    return (response) => ({
      amount: response.getAmount(),
      currency: response.getCurrency(),
    });
  }

  public getBalanceRequest(request: GetBalanceRequest): sierra_message_pb.GetBalanceRequest {
    const result: sierra_message_pb.GetBalanceRequest = this.factory('sierra_message_pb.GetBalanceRequest');
    result.setOrgId(request.orgId);
    result.setProjectId(request.projectId);
    return result;
  }

  public balance(): DataMapper<sierra_message_pb.Balance, Balance> {
    return (response) => {
      const result: Balance = {
        projectId: response.getProjectId(),
        settled: this.requiredMoney(response.getSettled(), 'settled', 'balance'),
        settledThrough: new Date(response.getSettledThrough()),
      };
      const updatedAt = response.getUpdatedAt();
      // zero means not provided
      if (updatedAt > 0) {
        result.updatedAt = new Date(updatedAt);
      }
      return result;
    };
  }

  public getAccountHistoryRequest(request: GetAccountHistoryRequest): sierra_message_pb.GetAccountHistoryRequest {
    const result: sierra_message_pb.GetAccountHistoryRequest = this.factory('sierra_message_pb.GetAccountHistoryRequest');
    result.setOrgId(request.orgId);
    result.setProjectId(request.projectId);
    result.setTimestampFrom(request.timestampFrom.getTime());
    if (request.timestampTo) {
      result.setTimestampTo(request.timestampTo.getTime());
    }
    return result;
  }

  public accountHistoryDay(): DataMapper<sierra_message_pb.AccountHistoryDay, AccountHistoryDay> {
    return (response) => ({
      timestamp: new Date(response.getTimestamp()),
      charged: this.requiredMoney(response.getCharged(), 'charged', 'account history day'),
      adjusted: this.requiredMoney(response.getAdjusted(), 'adjusted', 'account history day'),
      paid: this.requiredMoney(response.getPaid(), 'paid', 'account history day'),
      balance: this.requiredMoney(response.getBalance(), 'balance', 'account history day'),
    });
  }

  /**
   * Converts a sum the server must always provide, and fails if it's missing instead of making up a zero in an unknown currency.
   */
  private requiredMoney(value: sierra_message_pb.Money | undefined, field: string, message: string): Money {
    if (!value) {
      throw new Error(`No ${field} in ${message}`);
    }
    return this.money()(value);
  }

}

/**
 * Sets the value only when it's not empty, because a proto3 string has no presence and an empty one means it's not set.
 */
function setIfNotEmpty<T, K extends keyof T>(target: T, key: K, value: string): void {
  if (value.length > 0) {
    target[key] = value as T[K];
  }
}
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

}
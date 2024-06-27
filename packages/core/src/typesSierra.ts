import * as sierra_stat_message_pb from './generated/sierra.stat.message_pb';
import { DataMapper } from './Publisher';
import { MessageFactory } from './typesConvert';

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
  orgId: string;
  timestampFrom?: Date;
  timestampTo?: Date;
  projectIds?: string[];
  services?: string[];
  granularity?: Granularity;
  GroupBy?: GroupBy;
}

export interface RequestCount {
  timestamp: Date;
  count: number;
}

export interface GroupService {
  service: string;
}

export interface GroupProjectId {
  projectId: string;
}

export interface GroupRequestCount {
  group: GroupService | GroupProjectId;
  counts: RequestCount[];
}

export interface GetTokenStatRequest {
  orgId: string;
  tokenIds?: string[];
}

export interface TokenStat {
  tokenId: string;
  lastTimestamp: Date;
}

export class ConvertSierra {
  private readonly factory: MessageFactory;

  constructor(factory: MessageFactory) {
    this.factory = factory;
  }

  public getRequestCountRequest(request: GetRequestCountRequest): sierra_stat_message_pb.GetRequestCountRequest {
    const result: sierra_stat_message_pb.GetRequestCountRequest = this.factory('sierra_stat_message_pb.GetRequestCountRequest');
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
    if (request.GroupBy) {
      result.setGroupBy(request.GroupBy.valueOf());
    }
    return result;
  }

  public requestCount(): DataMapper<sierra_stat_message_pb.RequestCount, RequestCount> {
    return (response) => ({
      timestamp: new Date(response.getTimestamp()),
      count: response.getCount(),
    });
  }

  public groupRequestCount(): DataMapper<sierra_stat_message_pb.GroupRequestCount, GroupRequestCount> {
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
      }
      return {
        group: group,
        counts: response.getCountsList().map(this.requestCount()),
      };
    };
  }

  public getTokenStatRequest(request: GetTokenStatRequest): sierra_stat_message_pb.GetTokenStatRequest {
    const result: sierra_stat_message_pb.GetTokenStatRequest = this.factory('sierra_stat_message_pb.GetTokenStatRequest');
    result.setOrgId(request.orgId);
    if (request.tokenIds) {
      result.setTokenIdsList(request.tokenIds);
    }
    return result;
  }

  public tokenStat(): DataMapper<sierra_stat_message_pb.TokenStat, TokenStat> {
    return (response) => {
      return {
        tokenId: response.getTokenId(),
        lastTimestamp: new Date(response.getLastTimestamp()),
      };
    };
  }

}
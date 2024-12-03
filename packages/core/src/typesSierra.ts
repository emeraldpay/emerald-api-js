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

}
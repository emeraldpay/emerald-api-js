import {ConnectionListener, Publisher, publishToPromise, readOnce, sierra,} from '@emeraldpay/api';
import {ChannelCredentials} from '@grpc/grpc-js';
import {NativeChannel, callSingle, callStream} from '../channel';
import {ProjectClient} from '../generated/sierra_grpc_pb';
import {classFactory} from './Factory';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: clientVersion } = require('../../package.json');

export class SierraProjectClient {
  readonly client: ProjectClient;
  readonly channel: NativeChannel;
  readonly credentials: ChannelCredentials;
  readonly retries: number;

  private readonly convert: sierra.ConvertSierra = new sierra.ConvertSierra(classFactory);

  constructor(address: string, credentials: ChannelCredentials, agents: string[], retries = 3) {
    const agent = [...agents, `emerald-client-node/${clientVersion}`].join(' ');

    this.client = new ProjectClient(address, credentials, { 'grpc.primary_user_agent': agent });
    this.channel = new NativeChannel(this.client);
    this.credentials = credentials;
    this.retries = retries;
  }

  public setConnectionListener(listener: ConnectionListener): void {
    this.channel.setListener(listener);
  }

  public createProject(request: sierra.CreateProjectRequest): Promise<sierra.Project> {
    const req = this.convert.createProjectRequest(request);
    const mapper = this.convert.project();

    const call = callSingle(this.client.createProject.bind(this.client), mapper);
    // disable retries for create
    return publishToPromise(readOnce(this.channel, call, req, 1));
  }

  public listProjects(request: sierra.ListProjectsRequest): Publisher<sierra.Project> {
    const req = this.convert.listProjectsRequest(request);
    const mapper = this.convert.project();

    const call = callStream(this.client.listProjects.bind(this.client), mapper);
    return readOnce(this.channel, call, req, this.retries);
  }
}

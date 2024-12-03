import {Publisher, publishToPromise, readOnce, sierra} from "@emeraldpay/api";
import {WebChannel, callPromise, callStream} from "../channel";
import {CredentialsContext} from "../credentials";
import * as sierra_rpc from '../generated/SierraServiceClientPb';
import {classFactory} from "./Factory";

export class SierraProjectClient {
    readonly client: sierra_rpc.ProjectClient;
    readonly channel: WebChannel;
    readonly retries: number;

    private readonly convert = new sierra.ConvertSierra(classFactory);

    constructor(hostname: string, channel: WebChannel, credentials: CredentialsContext, retries = 3) {
        this.client = new sierra_rpc.ProjectClient(hostname, null, credentials.options);
        this.channel = channel;
        this.retries = retries;
    }

    public createProject(request: sierra.CreateProjectRequest): Promise<sierra.Project> {
        const req = this.convert.createProjectRequest(request);
        const mapper = this.convert.project();

        const call = callPromise(this.client.createProject.bind(this.client), mapper);
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

import { publishToPromise, readOnce } from "@emeraldpay/api";
import { callSingle, WebChannel } from "../channel";
import { GetDataRequest, GetDataResponse } from '../generated/insights_pb';
import * as insight_pb from '../generated/InsightsServiceClientPb';

export type InsightsData = {
    id: string,
    data: any
}

const textDecoder = new TextDecoder("utf-8");

export class InsightsClient {
    readonly client: insight_pb.InsightsClient;
    readonly channel: WebChannel;
    readonly retries: number;

    constructor(hostname: string, channel: WebChannel, retries = 3) {
        this.client = new insight_pb.InsightsClient(hostname);
        this.channel = channel;
        this.retries = retries;
    }

    getData(id: string): Promise<InsightsData> {
        const req = new GetDataRequest();
        req.setId(id);

        const call = callSingle(this.client.getData.bind(this.client), (resp: GetDataResponse) => {
            const data = resp.getData_asU8();
            const json = textDecoder.decode(data);

            const result: InsightsData = { id, data: JSON.parse(json) };
            return result;
        });
        return publishToPromise(readOnce(this.channel, call, req, this.retries));
    }
}

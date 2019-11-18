import * as insight_pb from '../generated/InsightsServiceClientPb';
import {GetDataRequest, GetDataResponse} from '../generated/insights_pb';
import {TextDecoder} from 'text-encoding';
import {callSingle, publishToPromise, readOnce, WebChannel} from "../channel";

const textDecoder = new TextDecoder("utf-8");

export class InsightsClient {
    private client: insight_pb.InsightsClient;
    private channel: WebChannel;

    constructor(hostname: string, channel: WebChannel) {
        this.client = new insight_pb.InsightsClient(hostname);
        this.channel = channel;
    }

    getData(id: string): Promise<InsightsData> {
        let req = new GetDataRequest();
        req.setId(id);
        let call = callSingle(this.client.getData.bind(this.client), (resp: GetDataResponse) => {
            let data = resp.getData_asU8();
            let json = textDecoder.decode(data);
            let result: InsightsData = {
                id, data: JSON.parse(json)
            };
            return result;
        });
        let retry = readOnce(this.channel, call, req);
        return publishToPromise(retry);
    }
}

export type InsightsData = {
    id: string,
    data: any
}
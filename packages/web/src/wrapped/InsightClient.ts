import * as insight_pb from '../generated/InsightServiceClientPb';
import {GetDataRequest, GetDataResponse} from '../generated/insight_pb';
import {TextDecoder} from 'text-encoding';
import {callSingle, publishToPromise, readOnce, WebChannel} from "../channel";

const textDecoder = new TextDecoder("utf-8");

export class InsightClient {
    private client: insight_pb.InsightClient;
    private channel: WebChannel;

    constructor(hostname: string, channel: WebChannel) {
        this.client = new insight_pb.InsightClient(hostname);
        this.channel = channel;
    }

    getData(id: string): Promise<InsightData> {
        let req = new GetDataRequest();
        req.setId(id);
        let call = callSingle(this.client.getData.bind(this.client), (resp: GetDataResponse) => {
            let data = resp.getData_asU8();
            let json = textDecoder.decode(data);
            let result: InsightData = {
                id, data: JSON.parse(json)
            };
            return result;
        });
        let retry = readOnce(this.channel, call, req);
        return publishToPromise(retry);
    }
}

export type InsightData = {
    id: string,
    data: any
}
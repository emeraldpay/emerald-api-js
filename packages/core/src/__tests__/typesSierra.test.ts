import * as sierra_message_pb from "../generated/sierra.message_pb";
import {MessageFactory} from "../typesConvert";
import {ConvertSierra} from "../typesSierra";

describe("groupRequestCount", () => {

    const factory: MessageFactory = (id: string) => {
        throw Error(`Unsupported type ${id}`)
    }
    const converter = new ConvertSierra(factory)

    const count = new sierra_message_pb.RequestCount()
        .setTimestamp(1700000000000)
        .setCount(15);

    test("grouped by service", () => {
        const response = new sierra_message_pb.GroupRequestCount()
            .setService("eth")
            .setCountsList([count]);

        expect(converter.groupRequestCount()(response)).toEqual({
            group: {service: "eth"},
            counts: [{timestamp: new Date(1700000000000), count: 15}],
        });
    });

    test("grouped by project", () => {
        const response = new sierra_message_pb.GroupRequestCount()
            .setProjectId("f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59")
            .setCountsList([count]);

        expect(converter.groupRequestCount()(response).group).toEqual({projectId: "f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59"});
    });

    test("fails without group", () => {
        const response = new sierra_message_pb.GroupRequestCount()
            .setCountsList([count]);

        expect(() => converter.groupRequestCount()(response)).toThrow("No group in request count");
    });
});

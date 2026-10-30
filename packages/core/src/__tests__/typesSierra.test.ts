import * as sierra_message_pb from "../generated/sierra.message_pb";
import {MessageFactory} from "../typesConvert";
import {ConvertSierra, LogStatus, isLogPartClose, isLogPartMessage, isLogPartStart} from "../typesSierra";

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

describe("getLogsRequest", () => {

    const factory: MessageFactory = (id: string) => {
        if (id === "sierra_message_pb.GetLogsRequest") {
            return new sierra_message_pb.GetLogsRequest();
        }
        throw Error(`Unsupported type ${id}`)
    }
    const converter = new ConvertSierra(factory)

    test("only org", () => {
        const result = converter.getLogsRequest({orgId: "cafe0000-0000-4000-a000-000000000000"});

        expect(result.getOrgId()).toBe("cafe0000-0000-4000-a000-000000000000");
        expect(result.hasProjectId()).toBeFalsy();
        expect(result.hasTokenId()).toBeFalsy();
        expect(result.hasService()).toBeFalsy();
    });

    test("all filters", () => {
        const result = converter.getLogsRequest({
            orgId: "cafe0000-0000-4000-a000-000000000000",
            projectId: "f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59",
            tokenId: "0b1a2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
            service: "emerald.blockchain/NativeCall",
        });

        expect(result.getOrgId()).toBe("cafe0000-0000-4000-a000-000000000000");
        expect(result.getProjectId()).toBe("f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59");
        expect(result.getTokenId()).toBe("0b1a2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d");
        expect(result.getService()).toBe("emerald.blockchain/NativeCall");
    });
});

describe("logResponse", () => {

    const factory: MessageFactory = (id: string) => {
        throw Error(`Unsupported type ${id}`)
    }
    const converter = new ConvertSierra(factory)

    function response(part: sierra_message_pb.LogResponsePart): sierra_message_pb.LogResponse {
        return new sierra_message_pb.LogResponse()
            .setRequestId("req-1")
            .setTimestamp(1700000000000)
            .setPart(part);
    }

    test("start", () => {
        const start = new sierra_message_pb.LogResponsePart.Start()
            .setOrgId("cafe0000-0000-4000-a000-000000000000")
            .setProjectId("f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59")
            .setTokenId("0b1a2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d")
            .setService("emerald.blockchain/NativeCall");

        const result = converter.logResponse()(response(new sierra_message_pb.LogResponsePart().setStart(start)));

        expect(result).toEqual({
            requestId: "req-1",
            timestamp: new Date(1700000000000),
            part: {
                type: "start",
                orgId: "cafe0000-0000-4000-a000-000000000000",
                projectId: "f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59",
                tokenId: "0b1a2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
                service: "emerald.blockchain/NativeCall",
            },
        });
        expect(isLogPartStart(result.part)).toBeTruthy();
    });

    test("ok message", () => {
        const message = new sierra_message_pb.LogResponsePart.Message()
            .setStatus(sierra_message_pb.LogResponsePart.Status.STATUS_OK)
            .setResponseSize(1024);

        const result = converter.logResponse()(response(new sierra_message_pb.LogResponsePart().setMessage(message)));

        expect(result.part).toEqual({
            type: "message",
            status: LogStatus.OK,
            responseSize: 1024,
        });
        expect(isLogPartMessage(result.part)).toBeTruthy();
    });

    test("error message", () => {
        const message = new sierra_message_pb.LogResponsePart.Message()
            .setStatus(sierra_message_pb.LogResponsePart.Status.STATUS_ERROR)
            .setErrorMessage("Upstream is not available")
            .setResponseSize(0);

        const result = converter.logResponse()(response(new sierra_message_pb.LogResponsePart().setMessage(message)));

        expect(result.part).toEqual({
            type: "message",
            status: LogStatus.ERROR,
            errorMessage: "Upstream is not available",
            responseSize: 0,
        });
    });

    test("denied message", () => {
        const message = new sierra_message_pb.LogResponsePart.Message()
            .setStatus(sierra_message_pb.LogResponsePart.Status.STATUS_DENIED);

        const result = converter.logResponse()(response(new sierra_message_pb.LogResponsePart().setMessage(message)));

        expect(result.part).toEqual({
            type: "message",
            status: LogStatus.DENIED,
            responseSize: 0,
        });
    });

    test("close", () => {
        const close = new sierra_message_pb.LogResponsePart.Close()
            .setTotalTime(150)
            .setMessageCount(3)
            .setRequestSize(256);

        const result = converter.logResponse()(response(new sierra_message_pb.LogResponsePart().setClose(close)));

        expect(result.part).toEqual({
            type: "close",
            totalTime: 150,
            messageCount: 3,
            requestSize: 256,
        });
        expect(isLogPartClose(result.part)).toBeTruthy();
        expect(isLogPartStart(result.part)).toBeFalsy();
    });

    test("fails without kind", () => {
        expect(() => converter.logResponse()(response(new sierra_message_pb.LogResponsePart()))).toThrow("No kind in log part");
    });

    test("fails without part", () => {
        const empty = new sierra_message_pb.LogResponse()
            .setRequestId("req-1")
            .setTimestamp(1700000000000);

        expect(() => converter.logResponse()(empty)).toThrow("No part in log response");
    });
});

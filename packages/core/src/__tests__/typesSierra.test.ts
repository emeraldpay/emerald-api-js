import * as sierra_message_pb from "../generated/sierra.message_pb";
import {MessageFactory} from "../typesConvert";
import {ConvertSierra, CostBreakdown, GetCostsRequest, Granularity, LogStatus, isLogPartClose, isLogPartMessage, isLogPartStart} from "../typesSierra";

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

describe("getCostsRequest", () => {

    const factory: MessageFactory = (id: string) => {
        if (id === "sierra_message_pb.GetCostsRequest") {
            return new sierra_message_pb.GetCostsRequest();
        }
        throw Error(`Unsupported type ${id}`)
    }
    const converter = new ConvertSierra(factory)

    test("required fields only", () => {
        const result = converter.getCostsRequest({
            orgId: "cafe0000-0000-4000-a000-000000000000",
            projectId: "f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59",
            timestampFrom: new Date(1700000000000),
            granularity: Granularity.HOUR,
        });

        expect(result.getOrgId()).toBe("cafe0000-0000-4000-a000-000000000000");
        expect(result.getProjectId()).toBe("f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59");
        expect(result.getTimestampFrom()).toBe(1700000000000);
        expect(result.getTimestampTo()).toBe(0);
        expect(result.getGranularity()).toBe(sierra_message_pb.Granularity.GRANULARITY_HOUR);
        expect(result.getBreakdown()).toBe(sierra_message_pb.CostBreakdown.COST_BREAKDOWN_UNSPECIFIED);
    });

    test("all fields", () => {
        const result = converter.getCostsRequest({
            orgId: "cafe0000-0000-4000-a000-000000000000",
            projectId: "f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59",
            timestampFrom: new Date(1700000000000),
            timestampTo: new Date(1700086400000),
            granularity: Granularity.DAY,
            breakdown: CostBreakdown.COMPONENT,
        });

        expect(result.getTimestampTo()).toBe(1700086400000);
        expect(result.getGranularity()).toBe(sierra_message_pb.Granularity.GRANULARITY_DAY);
        expect(result.getBreakdown()).toBe(sierra_message_pb.CostBreakdown.COST_BREAKDOWN_COMPONENT);
    });

    test("granularity finer than an hour is not allowed by the type", () => {
        const request: GetCostsRequest = {
            orgId: "cafe0000-0000-4000-a000-000000000000",
            projectId: "f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59",
            timestampFrom: new Date(1700000000000),
            // @ts-expect-error only HOUR, DAY and MONTH are accepted for the costs
            granularity: Granularity.MINUTE,
        };
        expect(request.granularity).toBe(Granularity.MINUTE);
    });

    test("granularity matches the protobuf", () => {
        expect(Granularity.FIVE_MINUTES.valueOf()).toBe(sierra_message_pb.Granularity.GRANULARITY_5_MINUTES);
        expect(Granularity.FIFTEEN_MINUTES.valueOf()).toBe(sierra_message_pb.Granularity.GRANULARITY_15_MINUTES);
    });

    test("breakdown matches the protobuf", () => {
        expect(CostBreakdown.UNSPECIFIED.valueOf()).toBe(sierra_message_pb.CostBreakdown.COST_BREAKDOWN_UNSPECIFIED);
        expect(CostBreakdown.METHOD.valueOf()).toBe(sierra_message_pb.CostBreakdown.COST_BREAKDOWN_METHOD);
        expect(CostBreakdown.COMPONENT.valueOf()).toBe(sierra_message_pb.CostBreakdown.COST_BREAKDOWN_COMPONENT);
    });
});

describe("costSeries", () => {

    const factory: MessageFactory = (id: string) => {
        throw Error(`Unsupported type ${id}`)
    }
    const converter = new ConvertSierra(factory)

    const projectId = "f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59";

    test("per project", () => {
        const response = new sierra_message_pb.CostSeries()
            .setProjectId(projectId)
            .setCurrency("USD")
            .setCostsList([
                new sierra_message_pb.Cost().setTimestamp(1700000000000).setAmount(-1.25),
                new sierra_message_pb.Cost().setTimestamp(1700003600000).setAmount(0),
            ]);

        expect(converter.costSeries()(response)).toEqual({
            projectId,
            currency: "USD",
            costs: [
                {timestamp: new Date(1700000000000), amount: -1.25},
                {timestamp: new Date(1700003600000), amount: 0},
            ],
        });
    });

    test("per method", () => {
        const response = new sierra_message_pb.CostSeries()
            .setProjectId(projectId)
            .setCurrency("EUR")
            .setMethod("emerald.blockchain/NativeCall")
            .setCostsList([
                new sierra_message_pb.Cost().setTimestamp(1700000000000).setAmount(-0.5),
            ]);

        expect(converter.costSeries()(response)).toEqual({
            projectId,
            currency: "EUR",
            method: "emerald.blockchain/NativeCall",
            costs: [
                {timestamp: new Date(1700000000000), amount: -0.5},
            ],
        });
    });

    test("per component includes quantity, even when zero", () => {
        const response = new sierra_message_pb.CostSeries()
            .setProjectId(projectId)
            .setCurrency("USD")
            .setMethod("emerald.market/GetRates")
            .setMeasurement("usage:rates")
            .setCostsList([
                new sierra_message_pb.Cost().setTimestamp(1700000000000).setQuantity(120).setAmount(-0.12),
                new sierra_message_pb.Cost().setTimestamp(1700003600000).setQuantity(0).setAmount(0),
            ]);

        expect(converter.costSeries()(response)).toEqual({
            projectId,
            currency: "USD",
            method: "emerald.market/GetRates",
            measurement: "usage:rates",
            costs: [
                {timestamp: new Date(1700000000000), quantity: 120, amount: -0.12},
                {timestamp: new Date(1700003600000), quantity: 0, amount: 0},
            ],
        });
    });

    test("no costs", () => {
        const response = new sierra_message_pb.CostSeries()
            .setProjectId(projectId)
            .setCurrency("USD");

        expect(converter.costSeries()(response).costs).toEqual([]);
    });
});

describe("orgBilling", () => {

    const factory: MessageFactory = (id: string) => {
        if (id === "sierra_message_pb.GetOrgBillingRequest") {
            return new sierra_message_pb.GetOrgBillingRequest();
        }
        throw Error(`Unsupported type ${id}`)
    }
    const converter = new ConvertSierra(factory)

    const orgId = "cafe0000-0000-4000-a000-000000000000";

    test("request", () => {
        expect(converter.getOrgBillingRequest({orgId}).getOrgId()).toBe(orgId);
    });

    test("full price", () => {
        const response = new sierra_message_pb.OrgBilling()
            .setOrgId(orgId);

        expect(converter.orgBilling()(response)).toEqual({orgId});
    });

    test("discount without an end", () => {
        const response = new sierra_message_pb.OrgBilling()
            .setOrgId(orgId)
            .setDiscount(new sierra_message_pb.Discount().setRate(0.8));

        expect(converter.orgBilling()(response)).toEqual({
            orgId,
            discount: {rate: 0.8},
        });
    });

    test("free of charge until a date", () => {
        const response = new sierra_message_pb.OrgBilling()
            .setOrgId(orgId)
            .setDiscount(new sierra_message_pb.Discount().setRate(0).setExpiresAt(1700000000000));

        expect(converter.orgBilling()(response)).toEqual({
            orgId,
            discount: {rate: 0, expiresAt: new Date(1700000000000)},
        });
    });

    test("with billing details", () => {
        const response = new sierra_message_pb.OrgBilling()
            .setOrgId(orgId)
            .setDetails(new sierra_message_pb.BillingDetails()
                .setLegalName("Test Inc.")
                .setEmail("billing@example.com")
                .setAddress(new sierra_message_pb.PostalAddress()
                    .setLinesList(["1 Main St", "Suite 2"])
                    .setCity("Springfield")
                    .setPostalCode("12345")
                    .setCountry("US")
                )
            );

        expect(converter.orgBilling()(response)).toEqual({
            orgId,
            details: {
                legalName: "Test Inc.",
                email: "billing@example.com",
                address: {
                    lines: ["1 Main St", "Suite 2"],
                    city: "Springfield",
                    postalCode: "12345",
                    country: "US",
                },
            },
        });
    });

    test("empty billing details", () => {
        const response = new sierra_message_pb.OrgBilling()
            .setOrgId(orgId)
            .setDetails(new sierra_message_pb.BillingDetails());

        expect(converter.orgBilling()(response)).toEqual({orgId, details: {}});
    });
});

describe("projectBilling", () => {

    const factory: MessageFactory = (id: string) => {
        if (id === "sierra_message_pb.GetProjectBillingRequest") {
            return new sierra_message_pb.GetProjectBillingRequest();
        }
        throw Error(`Unsupported type ${id}`)
    }
    const converter = new ConvertSierra(factory)

    const orgId = "cafe0000-0000-4000-a000-000000000000";
    const projectId = "f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59";

    test("request", () => {
        const result = converter.getProjectBillingRequest({orgId, projectId});

        expect(result.getOrgId()).toBe(orgId);
        expect(result.getProjectId()).toBe(projectId);
    });

    test("no budget", () => {
        const response = new sierra_message_pb.ProjectBilling()
            .setOrgId(orgId)
            .setProjectId(projectId)
            .setCurrency("EUR");

        expect(converter.projectBilling()(response)).toEqual({orgId, projectId, currency: "EUR"});
    });

    test("with a budget", () => {
        const response = new sierra_message_pb.ProjectBilling()
            .setOrgId(orgId)
            .setProjectId(projectId)
            .setCurrency("USD")
            .setDailyBudgetUsd(25.5);

        expect(converter.projectBilling()(response).dailyBudgetUsd).toBe(25.5);
    });

    test("zero budget is a budget", () => {
        const response = new sierra_message_pb.ProjectBilling()
            .setOrgId(orgId)
            .setProjectId(projectId)
            .setCurrency("USD")
            .setDailyBudgetUsd(0);

        expect(converter.projectBilling()(response)).toHaveProperty("dailyBudgetUsd", 0);
    });
});

describe("balance", () => {

    const factory: MessageFactory = (id: string) => {
        if (id === "sierra_message_pb.GetBalanceRequest") {
            return new sierra_message_pb.GetBalanceRequest();
        }
        throw Error(`Unsupported type ${id}`)
    }
    const converter = new ConvertSierra(factory)

    const orgId = "cafe0000-0000-4000-a000-000000000000";
    const projectId = "f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59";

    test("request", () => {
        const result = converter.getBalanceRequest({orgId, projectId});

        expect(result.getOrgId()).toBe(orgId);
        expect(result.getProjectId()).toBe(projectId);
    });

    test("all fields", () => {
        const response = new sierra_message_pb.Balance()
            .setProjectId(projectId)
            .setSettled(new sierra_message_pb.Money().setAmount(12.5).setCurrency("USD"))
            .setSettledThrough(1700000000000)
            .setUpdatedAt(1700000123000);

        expect(converter.balance()(response)).toEqual({
            projectId,
            settled: {amount: 12.5, currency: "USD"},
            settledThrough: new Date(1700000000000),
            updatedAt: new Date(1700000123000),
        });
    });

    test("negative balance without an update time", () => {
        const response = new sierra_message_pb.Balance()
            .setProjectId(projectId)
            .setSettled(new sierra_message_pb.Money().setAmount(-3.75).setCurrency("EUR"))
            .setSettledThrough(1700000000000);

        expect(converter.balance()(response)).toEqual({
            projectId,
            settled: {amount: -3.75, currency: "EUR"},
            settledThrough: new Date(1700000000000),
        });
    });

    test("fails without settled amount", () => {
        const response = new sierra_message_pb.Balance()
            .setProjectId(projectId)
            .setSettledThrough(1700000000000);

        expect(() => converter.balance()(response)).toThrow("No settled in balance");
    });
});

describe("accountHistory", () => {

    const factory: MessageFactory = (id: string) => {
        if (id === "sierra_message_pb.GetAccountHistoryRequest") {
            return new sierra_message_pb.GetAccountHistoryRequest();
        }
        throw Error(`Unsupported type ${id}`)
    }
    const converter = new ConvertSierra(factory)

    const orgId = "cafe0000-0000-4000-a000-000000000000";
    const projectId = "f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59";

    function usd(amount: number): sierra_message_pb.Money {
        return new sierra_message_pb.Money().setAmount(amount).setCurrency("USD");
    }

    test("request with required fields only", () => {
        const result = converter.getAccountHistoryRequest({
            orgId,
            projectId,
            timestampFrom: new Date(1700000000000),
        });

        expect(result.getOrgId()).toBe(orgId);
        expect(result.getProjectId()).toBe(projectId);
        expect(result.getTimestampFrom()).toBe(1700000000000);
        expect(result.getTimestampTo()).toBe(0);
    });

    test("request with the end", () => {
        const result = converter.getAccountHistoryRequest({
            orgId,
            projectId,
            timestampFrom: new Date(1700000000000),
            timestampTo: new Date(1700604800000),
        });

        expect(result.getTimestampTo()).toBe(1700604800000);
    });

    test("day with movements", () => {
        const response = new sierra_message_pb.AccountHistoryDay()
            .setTimestamp(1699920000000)
            .setCharged(usd(-4.2))
            .setAdjusted(usd(1))
            .setPaid(usd(50))
            .setBalance(usd(46.8));

        expect(converter.accountHistoryDay()(response)).toEqual({
            timestamp: new Date(1699920000000),
            charged: {amount: -4.2, currency: "USD"},
            adjusted: {amount: 1, currency: "USD"},
            paid: {amount: 50, currency: "USD"},
            balance: {amount: 46.8, currency: "USD"},
        });
    });

    test("day when nothing happened", () => {
        const response = new sierra_message_pb.AccountHistoryDay()
            .setTimestamp(1699920000000)
            .setCharged(usd(0))
            .setAdjusted(usd(0))
            .setPaid(usd(0))
            .setBalance(usd(0));

        expect(converter.accountHistoryDay()(response)).toEqual({
            timestamp: new Date(1699920000000),
            charged: {amount: 0, currency: "USD"},
            adjusted: {amount: 0, currency: "USD"},
            paid: {amount: 0, currency: "USD"},
            balance: {amount: 0, currency: "USD"},
        });
    });

    test.each(["charged", "adjusted", "paid", "balance"])("fails without %s", (field) => {
        const response = new sierra_message_pb.AccountHistoryDay()
            .setTimestamp(1699920000000)
            .setCharged(usd(0))
            .setAdjusted(usd(0))
            .setPaid(usd(0))
            .setBalance(usd(0));
        switch (field) {
            case "charged": response.clearCharged(); break;
            case "adjusted": response.clearAdjusted(); break;
            case "paid": response.clearPaid(); break;
            case "balance": response.clearBalance(); break;
        }

        expect(() => converter.accountHistoryDay()(response)).toThrow(`No ${field} in account history day`);
    });
});

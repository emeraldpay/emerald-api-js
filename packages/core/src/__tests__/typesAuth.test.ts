import * as field_mask_pb from "google-protobuf/google/protobuf/field_mask_pb";
import * as auth_pb from "../generated/auth_pb";
import {ConvertAuth} from "../typesAuth";
import {MessageFactory} from "../typesConvert";

const factory: MessageFactory = (id: string) => {
    switch (id) {
        case 'auth_pb.IssueTokenRequest':
            return new auth_pb.IssueTokenRequest();
        case 'auth_pb.UpdateTokenRequest':
            return new auth_pb.UpdateTokenRequest();
        case 'auth_pb.GetTokenRequest':
            return new auth_pb.GetTokenRequest();
        case 'field_mask_pb.FieldMask':
            return new field_mask_pb.FieldMask();
        default:
            throw new Error(`Unsupported class: ${id}`);
    }
};

const convert = new ConvertAuth(factory);

describe("issueTokenRequest", () => {
    test("minimal temp token", () => {
        const act = convert.issueTokenRequest({type: "temp"});

        expect(act.getType()).toBe(auth_pb.IssueTokenRequest.TokenType.TEMP);
        expect(act.getScopesList()).toEqual([]);
        expect(act.getExpireAt()).toBe(0);
        expect(act.getRequiredOriginList()).toEqual([]);
        expect(act.getRequiredIpList()).toEqual([]);
    });

    test("permanent token with all fields", () => {
        const act = convert.issueTokenRequest({
            type: "permanent",
            scopes: ["sierra:read"],
            expireAt: new Date(1700000000000),
            organizationId: "8a2a39ec-9d0e-4f3c-9d4b-4f6e1c1b2a01",
            projectId: "f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59",
            description: "Test token",
            requiredOrigins: ["example.com", "app.example.com"],
            requiredIps: ["192.168.1.10", "10.0.0.0/8"],
        });

        expect(act.getType()).toBe(auth_pb.IssueTokenRequest.TokenType.PERMANENT);
        expect(act.getScopesList()).toEqual(["sierra:read"]);
        expect(act.getExpireAt()).toBe(1700000000000);
        expect(act.getOrganizationId()).toBe("8a2a39ec-9d0e-4f3c-9d4b-4f6e1c1b2a01");
        expect(act.getProjectId()).toBe("f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59");
        expect(act.getDescription()).toBe("Test token");
        expect(act.getRequiredOriginList()).toEqual(["example.com", "app.example.com"]);
        expect(act.getRequiredIpList()).toEqual(["192.168.1.10", "10.0.0.0/8"]);
    });

    test("empty origin and ip lists", () => {
        const act = convert.issueTokenRequest({
            type: "permanent",
            requiredOrigins: [],
            requiredIps: [],
        });

        expect(act.getRequiredOriginList()).toEqual([]);
        expect(act.getRequiredIpList()).toEqual([]);
    });

    test("survives serialization", () => {
        const req = convert.issueTokenRequest({
            type: "permanent",
            requiredOrigins: ["example.com"],
            requiredIps: ["10.0.0.0/8"],
        });

        const act = auth_pb.IssueTokenRequest.deserializeBinary(req.serializeBinary());

        expect(act.getRequiredOriginList()).toEqual(["example.com"]);
        expect(act.getRequiredIpList()).toEqual(["10.0.0.0/8"]);
    });
});

describe("issuedTokenResponse", () => {
    test("with expiration", () => {
        const res = new auth_pb.IssuedTokenResponse();
        res.setTokenId("5b8e4f2a-1c3d-4e5f-9a7b-6c8d0e1f2a3b");
        res.setAuthSecret("emrld_y7WBMb1KR5f0rNfwbT6UE4BpCZ0ZnJbpFrfvwf");
        res.setExpiresAt(1700000000000);

        const act = convert.issuedTokenResponse(res);

        expect(act.tokenId).toBe("5b8e4f2a-1c3d-4e5f-9a7b-6c8d0e1f2a3b");
        expect(act.secret).toBe("emrld_y7WBMb1KR5f0rNfwbT6UE4BpCZ0ZnJbpFrfvwf");
        expect(act.expiresAt).toEqual(new Date(1700000000000));
    });

    test("never expires", () => {
        const res = new auth_pb.IssuedTokenResponse();
        res.setTokenId("5b8e4f2a-1c3d-4e5f-9a7b-6c8d0e1f2a3b");
        res.setAuthSecret("emrld_y7WBMb1KR5f0rNfwbT6UE4BpCZ0ZnJbpFrfvwf");
        res.setExpiresAt(0);

        const act = convert.issuedTokenResponse(res);

        expect(act.tokenId).toBe("5b8e4f2a-1c3d-4e5f-9a7b-6c8d0e1f2a3b");
        expect(act.expiresAt.getTime()).toBeGreaterThan(Date.now() + 9 * 365 * 24 * 60 * 60 * 1000);
    });
});

describe("updateTokenRequest", () => {
    const ids = {
        organizationId: "8a2a39ec-9d0e-4f3c-9d4b-4f6e1c1b2a01",
        projectId: "f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59",
        tokenId: "5b8e4f2a-1c3d-4e5f-9a7b-6c8d0e1f2a3b",
    };

    test("sets ids", () => {
        const act = convert.updateTokenRequest({...ids, description: "Test"});

        expect(act.getOrganizationId()).toBe(ids.organizationId);
        expect(act.getProjectId()).toBe(ids.projectId);
        expect(act.getTokenId()).toBe(ids.tokenId);
    });

    test("mask includes only provided fields", () => {
        const act = convert.updateTokenRequest({
            ...ids,
            description: "New description",
            requiredIps: ["10.0.0.0/8"],
        });

        expect(act.getUpdateMask()?.getPathsList()).toEqual(["description", "required_ip"]);
        expect(act.getDescription()).toBe("New description");
        expect(act.getRequiredIpList()).toEqual(["10.0.0.0/8"]);
    });

    test("all fields", () => {
        const act = convert.updateTokenRequest({
            ...ids,
            scopes: ["sierra:read"],
            expireAt: new Date(1700000000000),
            description: "New description",
            requiredOrigins: ["example.com"],
            requiredIps: ["192.168.1.10"],
        });

        expect(act.getUpdateMask()?.getPathsList()).toEqual(["scopes", "expire_at", "description", "required_origin", "required_ip"]);
        expect(act.getScopesList()).toEqual(["sierra:read"]);
        expect(act.getExpireAt()).toBe(1700000000000);
        expect(act.getDescription()).toBe("New description");
        expect(act.getRequiredOriginList()).toEqual(["example.com"]);
        expect(act.getRequiredIpList()).toEqual(["192.168.1.10"]);
    });

    test("null erases values", () => {
        const act = convert.updateTokenRequest({
            ...ids,
            scopes: null,
            expireAt: null,
            description: null,
            requiredOrigins: null,
            requiredIps: null,
        });

        expect(act.getUpdateMask()?.getPathsList()).toEqual(["scopes", "expire_at", "description", "required_origin", "required_ip"]);
        expect(act.getScopesList()).toEqual([]);
        expect(act.getExpireAt()).toBe(0);
        expect(act.getDescription()).toBe("");
        expect(act.getRequiredOriginList()).toEqual([]);
        expect(act.getRequiredIpList()).toEqual([]);
    });

    test("empty values are included in the mask", () => {
        const act = convert.updateTokenRequest({
            ...ids,
            description: "",
            requiredOrigins: [],
        });

        expect(act.getUpdateMask()?.getPathsList()).toEqual(["description", "required_origin"]);
    });

    test("fails when nothing to update", () => {
        expect(() => convert.updateTokenRequest({...ids})).toThrow();
    });

    test("survives serialization", () => {
        const req = convert.updateTokenRequest({...ids, expireAt: null, requiredOrigins: ["example.com"]});

        const act = auth_pb.UpdateTokenRequest.deserializeBinary(req.serializeBinary());

        expect(act.getTokenId()).toBe(ids.tokenId);
        expect(act.getUpdateMask()?.getPathsList()).toEqual(["expire_at", "required_origin"]);
        expect(act.getRequiredOriginList()).toEqual(["example.com"]);
    });
});

describe("updateTokenResponse", () => {
    test("with expiration", () => {
        const res = new auth_pb.IssuedTokenResponse();
        res.setTokenId("5b8e4f2a-1c3d-4e5f-9a7b-6c8d0e1f2a3b");
        res.setExpiresAt(1700000000000);

        const act = convert.updateTokenResponse(res);

        expect(act.tokenId).toBe("5b8e4f2a-1c3d-4e5f-9a7b-6c8d0e1f2a3b");
        expect(act.expiresAt).toEqual(new Date(1700000000000));
    });

    test("never expires", () => {
        const res = new auth_pb.IssuedTokenResponse();
        res.setTokenId("5b8e4f2a-1c3d-4e5f-9a7b-6c8d0e1f2a3b");
        res.setExpiresAt(0);

        const act = convert.updateTokenResponse(res);

        expect(act.tokenId).toBe("5b8e4f2a-1c3d-4e5f-9a7b-6c8d0e1f2a3b");
        expect(act.expiresAt).toBeUndefined();
    });
});

describe("listTokensResponse", () => {
    function tokenDetails(): auth_pb.TokenDetails {
        const token = new auth_pb.TokenDetails();
        token.setOrganizationId("8a2a39ec-9d0e-4f3c-9d4b-4f6e1c1b2a01");
        token.setProjectId("f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59");
        token.setTokenId("5b8e4f2a-1c3d-4e5f-9a7b-6c8d0e1f2a3b");
        token.setCreationDate(1690000000000);
        return token;
    }

    test("all fields", () => {
        const token = tokenDetails();
        token.setDescription("Test token");
        token.setExpiresAt(1700000000000);
        token.setRequireOriginList(["example.com", "app.example.com"]);
        token.setRequireIpList(["192.168.1.10", "10.0.0.0/8"]);
        const res = new auth_pb.ListTokensResponse();
        res.setTokensList([token]);

        const act = convert.listTokensResponse(res);

        expect(act.tokens).toEqual([{
            organizationId: "8a2a39ec-9d0e-4f3c-9d4b-4f6e1c1b2a01",
            projectId: "f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59",
            tokenId: "5b8e4f2a-1c3d-4e5f-9a7b-6c8d0e1f2a3b",
            createdAt: new Date(1690000000000),
            description: "Test token",
            expiresAt: new Date(1700000000000),
            requiredOrigins: ["example.com", "app.example.com"],
            requiredIps: ["192.168.1.10", "10.0.0.0/8"],
        }]);
    });

    test("no restrictions and never expires", () => {
        const res = new auth_pb.ListTokensResponse();
        res.setTokensList([tokenDetails()]);

        const act = convert.listTokensResponse(res);

        expect(act.tokens).toHaveLength(1);
        expect(act.tokens[0].description).toBeUndefined();
        expect(act.tokens[0].expiresAt).toBeUndefined();
        expect(act.tokens[0].requiredOrigins).toEqual([]);
        expect(act.tokens[0].requiredIps).toEqual([]);
    });

    test("survives serialization", () => {
        const token = tokenDetails();
        token.setExpiresAt(1700000000000);
        token.setRequireOriginList(["example.com"]);
        token.setRequireIpList(["10.0.0.0/8"]);
        const original = new auth_pb.ListTokensResponse();
        original.setTokensList([token]);

        const res = auth_pb.ListTokensResponse.deserializeBinary(original.serializeBinary());
        const act = convert.listTokensResponse(res);

        expect(act.tokens[0].expiresAt).toEqual(new Date(1700000000000));
        expect(act.tokens[0].requiredOrigins).toEqual(["example.com"]);
        expect(act.tokens[0].requiredIps).toEqual(["10.0.0.0/8"]);
    });
});

describe("getTokenRequest", () => {
    test("sets ids", () => {
        const act = convert.getTokenRequest({
            organizationId: "8a2a39ec-9d0e-4f3c-9d4b-4f6e1c1b2a01",
            projectId: "f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59",
            tokenId: "5b8e4f2a-1c3d-4e5f-9a7b-6c8d0e1f2a3b",
        });

        expect(act.getOrganizationId()).toBe("8a2a39ec-9d0e-4f3c-9d4b-4f6e1c1b2a01");
        expect(act.getProjectId()).toBe("f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59");
        expect(act.getTokenId()).toBe("5b8e4f2a-1c3d-4e5f-9a7b-6c8d0e1f2a3b");
    });
});

describe("tokenDetails", () => {
    test("all fields", () => {
        const res = new auth_pb.TokenDetails();
        res.setOrganizationId("8a2a39ec-9d0e-4f3c-9d4b-4f6e1c1b2a01");
        res.setProjectId("f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59");
        res.setTokenId("5b8e4f2a-1c3d-4e5f-9a7b-6c8d0e1f2a3b");
        res.setCreationDate(1690000000000);
        res.setDescription("Test token");
        res.setExpiresAt(1700000000000);
        res.setRequireOriginList(["example.com"]);
        res.setRequireIpList(["10.0.0.0/8"]);

        // called unbound, as it's passed as a response mapper by the clients
        const mapper = convert.tokenDetails;
        const act = mapper(res);

        expect(act).toEqual({
            organizationId: "8a2a39ec-9d0e-4f3c-9d4b-4f6e1c1b2a01",
            projectId: "f3c2b1a0-7e6d-4c5b-8a9f-0e1d2c3b4a59",
            tokenId: "5b8e4f2a-1c3d-4e5f-9a7b-6c8d0e1f2a3b",
            createdAt: new Date(1690000000000),
            description: "Test token",
            expiresAt: new Date(1700000000000),
            requiredOrigins: ["example.com"],
            requiredIps: ["10.0.0.0/8"],
        });
    });
});

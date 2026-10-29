import {StandardSigner} from "../signature";
import {AuthRequest, AuthResponse, CredentialsClient, RefreshRequest} from "../typesAuth";

const { version: clientVersion } = require('../../package.json');

/**
 * Credentials client that records the authentication requests and responds with a successful auth
 */
class RecordingClient implements CredentialsClient {
    readonly requests: AuthRequest[] = [];

    authenticate(req: AuthRequest): Promise<AuthResponse> {
        this.requests.push(req);
        return Promise.resolve({
            status: 0,
            jwt: "test-jwt",
            expiresAt: new Date(Date.now() + 60_000),
            refreshToken: "test-refresh-token",
        });
    }

    refresh(_req: RefreshRequest): Promise<AuthResponse> {
        return Promise.reject(new Error('should not be called'));
    }
}

const secretToken = 'emrld_yKb3jXMKRJLUWFzL7wPrktkherocZCBy7W6qZH';

describe("StandardSigner agents", () => {
    test("sends provided agents", async () => {
        const client = new RecordingClient();
        const signer = new StandardSigner(client, secretToken, ['test-client/1.2.3', 'emerald-client-node/0.0.1']);

        await signer.getAuth();

        expect(client.requests.length).toBe(1);
        expect(client.requests[0].agent).toEqual(['test-client/1.2.3', 'emerald-client-node/0.0.1']);
    });

    test("sends default agent when none provided", async () => {
        const client = new RecordingClient();
        const signer = new StandardSigner(client, secretToken, []);

        await signer.getAuth();

        expect(client.requests[0].agent).toEqual([`emerald-client/${clientVersion}`]);
    });

    test("sends default agent when agents are undefined", async () => {
        const client = new RecordingClient();
        const signer = new StandardSigner(client, secretToken, undefined);

        await signer.getAuth();

        expect(client.requests[0].agent).toEqual([`emerald-client/${clientVersion}`]);
    });
});

import {StandardSigner} from "../signature";
import {AuthRequest, AuthResponse, CredentialsClient} from "../typesAuth";
// eslint-disable-next-line @typescript-eslint/no-require-imports
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

    refresh(): Promise<AuthResponse> {
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
        const signer = new StandardSigner(client, secretToken, undefined as never);

        await signer.getAuth();

        expect(client.requests[0].agent).toEqual([`emerald-client/${clientVersion}`]);
    });
});

/**
 * Credentials client that responds only when the test calls `complete`
 */
class DelayedClient implements CredentialsClient {
    private pending: Array<(response: AuthResponse) => void> = [];

    authenticate(): Promise<AuthResponse> {
        return new Promise((resolve) => this.pending.push(resolve));
    }

    refresh(): Promise<AuthResponse> {
        return Promise.reject(new Error('should not be called'));
    }

    complete(response: AuthResponse): void {
        this.pending.forEach((resolve) => resolve(response));
        this.pending = [];
    }
}

describe("StandardSigner concurrent calls", () => {

    test("a waiting call gets the same token", async () => {
        const client = new DelayedClient();
        const signer = new StandardSigner(client, secretToken, []);

        const first = signer.getAuth();
        const second = signer.getAuth();
        client.complete({status: 0, jwt: "test-jwt", expiresAt: new Date(Date.now() + 60_000), refreshToken: "test-refresh-token"});

        expect(await second).toBe(await first);
    });

    test("a waiting call fails with an error when authentication fails", async () => {
        const client = new DelayedClient();
        const signer = new StandardSigner(client, secretToken, []);
        const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

        const first = signer.getAuth();
        const second = signer.getAuth();
        client.complete({status: 1, denyMessage: "denied"});

        // the first call gets the actual failure, and the waiting one gets an Error instead of `undefined`
        await expect(first).rejects.toThrow("Failed to auth. Code=1, message=denied");
        await expect(second).rejects.toThrow("Failed to authenticate");
        consoleWarn.mockRestore();
    });
});

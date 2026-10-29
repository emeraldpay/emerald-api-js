import {Signer} from "@emeraldpay/api";
import {ClientReadableStream, Request, RpcError, StatusCode, StreamInterceptor} from "grpc-web";
import {CredentialsContext, StreamPipe} from "../credentials";

/**
 * A stream that records the listeners and lets to emit events to them
 */
class FakeStream {
    readonly listeners: Array<[string, (...args: unknown[]) => void]> = [];
    cancelled = false;

    on(eventType: string, callback: (...args: unknown[]) => void): FakeStream {
        this.listeners.push([eventType, callback]);
        return this;
    }

    removeListener(eventType: string, callback: (...args: unknown[]) => void): void {
        const index = this.listeners.findIndex(([e, c]) => e === eventType && c === callback);
        if (index >= 0) {
            this.listeners.splice(index, 1);
        }
    }

    cancel(): void {
        this.cancelled = true;
    }

    emit(eventType: string, value?: unknown): void {
        this.listeners
            .filter(([e]) => e === eventType)
            .forEach(([, c]) => c(value));
    }

    asStream(): ClientReadableStream<string> {
        return this as unknown as ClientReadableStream<string>;
    }
}

describe("StreamPipe", () => {

    test("forwards listeners added before the stream is set", () => {
        const pipe = new StreamPipe<string>();
        const received: string[] = [];
        pipe.on("data", (value) => received.push(value));

        const stream = new FakeStream();
        pipe.setDelegate(stream.asStream());
        stream.emit("data", "hello");

        expect(received).toEqual(["hello"]);
    });

    test("forwards listeners added after the stream is set", () => {
        const pipe = new StreamPipe<string>();
        const stream = new FakeStream();
        pipe.setDelegate(stream.asStream());

        const received: string[] = [];
        pipe.on("data", (value) => received.push(value));
        stream.emit("data", "hello");

        expect(received).toEqual(["hello"]);
    });

    test("doesn't forward removed listeners", () => {
        const pipe = new StreamPipe<string>();
        const received: string[] = [];
        const listener = (value: string): void => {
            received.push(value);
        };
        pipe.on("data", listener);
        pipe.removeListener("data", listener);

        const stream = new FakeStream();
        pipe.setDelegate(stream.asStream());
        stream.emit("data", "hello");

        expect(received).toEqual([]);
        expect(stream.listeners).toEqual([]);
    });

    test("reports a failure to error listeners", () => {
        const pipe = new StreamPipe<string>();
        const errors: RpcError[] = [];
        let ended = false;
        pipe.on("error", (err) => errors.push(err));
        pipe.on("end", () => {
            ended = true;
        });

        pipe.fail(new RpcError(StatusCode.UNAUTHENTICATED, "test failure", {}));

        expect(errors.length).toBe(1);
        expect(errors[0].code).toBe(StatusCode.UNAUTHENTICATED);
        expect(errors[0].message).toBe("test failure");
        // same as a failed gRPC call, which doesn't call `end` after an error
        expect(ended).toBeFalsy();
    });

    test("reports a failure to error listeners added later", () => {
        const pipe = new StreamPipe<string>();
        pipe.fail(new RpcError(StatusCode.UNAUTHENTICATED, "test failure", {}));

        const errors: RpcError[] = [];
        pipe.on("error", (err) => errors.push(err));

        expect(errors.length).toBe(1);
    });

    test("cancel before the stream is set doesn't fail", () => {
        const pipe = new StreamPipe<string>();

        expect(() => pipe.cancel()).not.toThrow();
    });

    test("cancels the stream set after the pipe was cancelled", () => {
        const pipe = new StreamPipe<string>();
        const received: string[] = [];
        pipe.on("data", (value) => received.push(value));
        pipe.cancel();

        const stream = new FakeStream();
        pipe.setDelegate(stream.asStream());
        stream.emit("data", "hello");

        expect(stream.cancelled).toBeTruthy();
        expect(received).toEqual([]);
    });

    test("cancels the stream", () => {
        const pipe = new StreamPipe<string>();
        const stream = new FakeStream();
        pipe.setDelegate(stream.asStream());

        pipe.cancel();

        expect(stream.cancelled).toBeTruthy();
    });
});

describe("CredentialsContext stream interceptor", () => {

    const secretToken = 'emrld_yKb3jXMKRJLUWFzL7wPrktkherocZCBy7W6qZH';

    const failingSigner: Signer = {
        getAuth: () => Promise.reject(new Error("test auth failure")),
        setListener: () => {},
        setAuthentication: () => {},
    };

    test("reports an authentication failure as an error on the stream", async () => {
        const credentials = new CredentialsContext("https://localhost", secretToken);
        // replace the signer which would call the actual server
        (credentials as unknown as { signer: Signer }).signer = failingSigner;
        const interceptor: StreamInterceptor<unknown, string> = credentials.options['streamInterceptors'][0];

        const request = {getMetadata: () => ({})} as unknown as Request<unknown, string>;
        const invoker = jest.fn();
        const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

        const errors: RpcError[] = [];
        const stream = interceptor.intercept(request, invoker);
        await new Promise<void>((resolve) => {
            stream.on("error", (err) => {
                errors.push(err);
                resolve();
            });
        });
        consoleWarn.mockRestore();

        expect(invoker).not.toHaveBeenCalled();
        expect(errors.length).toBe(1);
        expect(errors[0].code).toBe(StatusCode.UNAUTHENTICATED);
        expect(errors[0].message).toContain("test auth failure");
    });
});

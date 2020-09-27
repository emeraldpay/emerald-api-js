import {BufferedPublisher, ManagedPublisher, publishListToPromise} from "../Publisher";

describe("Publisher", () => {
    describe("BufferedPublisher", () => {
        it("call finally added late", (done) => {
            let buffer = new BufferedPublisher<number>();
            buffer.emitClosed();
            buffer.finally(() => done());
        });

        it("call finally added first", (done) => {
            let buffer = new BufferedPublisher<number>();
            buffer.finally(() => done());
            buffer.emitClosed();
        });

        it("call onData added late", (done) => {
            let buffer = new BufferedPublisher<number>();
            buffer.emitData(1);
            buffer.onData((n) => n == 1 ? done() : done.fail());
        });

        it("call onData added first", (done) => {
            let buffer = new BufferedPublisher<number>();
            buffer.onData((n) => n == 1 ? done() : done.fail());
            buffer.emitData(1);
        });

        it("call onError added late", (done) => {
            let buffer = new BufferedPublisher<number>();
            buffer.emitError(new Error("test"));
            buffer.onError((e) => e.message == "test" ? done() : done.fail());
        });

        it("call onError added first", (done) => {
            let buffer = new BufferedPublisher<number>();
            buffer.onError((e) => e.message == "test" ? done() : done.fail());
            buffer.emitError(new Error("test"));
        });
    });

    describe("publishListToPromise", () => {
        it("single item", (done) => {
            let publisher = new ManagedPublisher<number>();
            let act = publishListToPromise(publisher);
            act
                .then((value) => {
                    if (value.length == 1 && value[0] == 1) done()
                    else done.fail("invalid data")
                })
                .catch((e) => done.fail(e));
            publisher.emitData(1);
            publisher.emitClosed()
        });

        it("two items", (done) => {
            let publisher = new ManagedPublisher<number>();
            let act = publishListToPromise(publisher);
            act
                .then((value) => {
                    if (value.length == 2 && value[0] == 1 && value[1] == 3) done()
                    else done.fail("invalid data")
                })
                .catch((e) => done.fail(e));
            publisher.emitData(1);
            publisher.emitData(3);
            publisher.emitClosed()
        });

        it("no items", (done) => {
            let publisher = new ManagedPublisher<number>();
            let act = publishListToPromise(publisher);
            act
                .then((value) => {
                    if (value.length == 0) done()
                    else done.fail("invalid data")
                })
                .catch((e) => done.fail(e));
            publisher.emitClosed();
        });

        it("error", (done) => {
            let publisher = new ManagedPublisher<number>();
            let act = publishListToPromise(publisher);
            act
                .then((value) => done.fail())
                .catch((e) => e.message == "test" ? done() : done.fail());
            publisher.emitError(new Error("test"));
        });
    });
});
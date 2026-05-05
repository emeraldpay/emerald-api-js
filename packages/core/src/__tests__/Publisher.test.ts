import { BufferedPublisher, ManagedPublisher, PromisePublisher, publishListToPromise } from '../Publisher';

describe('Publisher', () => {
  describe('BufferedPublisher', () => {
    it('call finally added late', (done) => {
      const buffer = new BufferedPublisher<number>();

      buffer.emitClosed();

      buffer.finally(() => done());
    });

    it('call finally added first', (done) => {
      const buffer = new BufferedPublisher<number>();

      buffer.finally(() => done());

      buffer.emitClosed();
    });

    it('call onData added late', (done) => {
      const buffer = new BufferedPublisher<number>();

      buffer.emitData(1);

      buffer.onData((data) => done(data === 1 ? undefined : 'Invalid data'));
    });

    it('call onData added first', (done) => {
      const buffer = new BufferedPublisher<number>();

      buffer.onData((data) => done(data === 1 ? undefined : 'Invalid data'));

      buffer.emitData(1);
    });

    it('call onError added late', (done) => {
      const buffer = new BufferedPublisher<number>();

      buffer.emitError(new Error('test'));

      buffer.onError((error) => done(error.message === 'test' ? undefined : 'Invalid error'));
    });

    it('call onError added first', (done) => {
      const buffer = new BufferedPublisher<number>();

      buffer.onError((error) => done(error.message === 'test' ? undefined : 'Invalid error'));

      buffer.emitError(new Error('test'));
    });
  });

  describe('publishListToPromise', () => {
    it('single item', (done) => {
      const publisher = new ManagedPublisher<number>();

      const act = publishListToPromise(publisher);

      act
        .then((value) => done(value.length === 1 && value[0] === 1 ? undefined : 'Invalid data'))
        .catch((error) => done(error));

      publisher.emitData(1);
      publisher.emitClosed();
    });

    it('two items', (done) => {
      const publisher = new ManagedPublisher<number>();

      const act = publishListToPromise(publisher);

      act
        .then((value) => done(value.length === 2 && value[0] === 1 && value[1] === 3 ? undefined : 'Invalid data'))
        .catch((error) => done(error));

      publisher.emitData(1);
      publisher.emitData(3);
      publisher.emitClosed();
    });

    it('no items', (done) => {
      const publisher = new ManagedPublisher<number>();

      const act = publishListToPromise(publisher);

      act.then((value) => done(value.length == 0 ? undefined : 'Invalid data')).catch((error) => done(error));

      publisher.emitClosed();
    });

    it('error', (done) => {
      const publisher = new ManagedPublisher<number>();

      const act = publishListToPromise(publisher);

      act.then(() => done()).catch((error) => done(error.message === 'test' ? undefined : error));

      publisher.emitError(new Error('test'));
    });
  });

  describe('PromisePublisher', () => {
    // Regression: a rejected promise must not surface as an unhandled rejection
    // when only `onError` (or no handler) is attached. Previously the lazy
    // `then`/`catch`/`finally` chains each pulled directly off the source
    // promise, so the `then` and `finally` chains leaked the rejection.
    it('rejected promise does not produce unhandled rejection', async () => {
      const unhandled: unknown[] = [];
      const onUnhandled = (reason: unknown): void => {
        unhandled.push(reason);
      };
      process.on('unhandledRejection', onUnhandled);

      try {
        const publisher = new PromisePublisher<number>(Promise.reject({ code: 7, message: 'denied' }));

        const errors: Array<{ code: number; message: string }> = [];
        const closes: number[] = [];

        publisher.onError((error) => errors.push(error as { code: number; message: string }));
        publisher.finally(() => closes.push(1));

        // Let microtasks settle so any unhandled rejection would have surfaced.
        await new Promise((resolve) => setImmediate(resolve));

        expect(errors).toEqual([{ code: 7, message: 'denied' }]);
        expect(closes).toEqual([1]);
        expect(unhandled).toEqual([]);
      } finally {
        process.off('unhandledRejection', onUnhandled);
      }
    });

    it('resolved promise delivers data and closes', async () => {
      const publisher = new PromisePublisher<number>(Promise.resolve(42));

      const data: number[] = [];
      const closes: number[] = [];

      publisher.onData((value) => data.push(value));
      publisher.finally(() => closes.push(1));

      await new Promise((resolve) => setImmediate(resolve));

      expect(data).toEqual([42]);
      expect(closes).toEqual([1]);
    });
  });
});

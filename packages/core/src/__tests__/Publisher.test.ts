import { BufferedPublisher, ManagedPublisher, publishListToPromise } from '../Publisher';

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
});

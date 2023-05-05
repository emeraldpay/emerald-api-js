/**
 * Factory to create instance of a class.
 *
 * It seems that Protobuf generates slightly different implementations of messages for native/node and for web. To avoid
 * any casting errors, a converted creates object through the factory. The factory implementation may use different
 * classes to instantiate it.
 *
 * @param id class name. Ex. `blockchain_pb.NativeCallRequest`
 * @return instance of a fresh object for the specified name. I.e. `return new blockchain_pb.NativeCallRequest()`
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MessageFactory = (id: string) => any;

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

/**
 * Returns a sub-message of a response which must always be set. Protobuf allows any message field to be missing,
 * but for a required one it means a corrupted response.
 *
 * @param value the field value, i.e. `response.getAddress()`
 * @param field name of the field, for the error message
 * @throws Error if the value is missing
 */
export function required<T>(value: T | null | undefined, field: string): T {
  if (value == null) {
    throw new Error(`Invalid response: no ${field}`);
  }
  return value;
}

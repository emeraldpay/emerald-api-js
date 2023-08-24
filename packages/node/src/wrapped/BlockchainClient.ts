import {
  AddressBalance,
  BalanceRequest,
  Blockchain,
  ChainHead,
  ConnectionListener,
  ConvertBlockchain,
  DataMapper,
  EstimateFeeRequest,
  EstimateFeeResponse,
  NativeCallError,
  NativeCallItem,
  NativeCallResponse,
  Publisher,
  TxStatusRequest,
  TxStatusResponse,
  alwaysRetry,
  publishListToPromise,
  publishToPromise,
  readOnce,
} from '@emeraldpay/api';
import { ChannelCredentials } from '@grpc/grpc-js';
import { NativeChannel, callSingle, callStream } from '../channel';
import { BlockchainClient as ProtoBlockchainClient } from '../generated/blockchain_grpc_pb';
import {
  AddressBalance as ProtoAddressBalance,
  EstimateFeeResponse as ProtoEstimateFeeResponse,
  TxStatus as ProtoTxStatus,
} from '../generated/blockchain_pb';
import { classFactory } from './Factory';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: clientVersion } = require('../../package.json');

export class BlockchainClient {
  readonly client: ProtoBlockchainClient;
  readonly channel: NativeChannel;
  readonly credentials: ChannelCredentials;
  readonly retries: number;

  private readonly convert = new ConvertBlockchain(classFactory);

  constructor(address: string, credentials: ChannelCredentials, agents: string[], retries = 3) {
    const agent = [...agents, `emerald-client-node/${clientVersion}`].join(' ');

    this.client = new ProtoBlockchainClient(address, credentials, { 'grpc.primary_user_agent': agent });
    this.channel = new NativeChannel(this.client);
    this.credentials = credentials;
    this.retries = retries;
  }

  public setConnectionListener(listener: ConnectionListener): void {
    this.channel.setListener(listener);
  }

  public subscribeHead(blockchain: Blockchain): Publisher<ChainHead> {
    const request = this.convert.chain(blockchain);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapper: DataMapper<any, ChainHead> = this.convert.headResponse();

    const call = callStream(this.client.subscribeHead.bind(this.client), mapper);
    return alwaysRetry(this.channel, call, request, this.retries);
  }

  public nativeCall(chain: Blockchain, calls: NativeCallItem[]): Publisher<NativeCallResponse | NativeCallError> {
    const request = this.convert.nativeCallRequest(chain, calls);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapper: DataMapper<any, NativeCallResponse | NativeCallError> = this.convert.nativeCallResponse();

    const call = callStream(this.client.nativeCall.bind(this.client), mapper);
    return readOnce(this.channel, call, request, this.retries);
  }

  public subscribeBalance(request: BalanceRequest): Publisher<AddressBalance> {
    const protoRequest = this.convert.balanceRequest(request);
    const mapper: DataMapper<ProtoAddressBalance, AddressBalance> = this.convert.balanceResponse();

    const call = callStream(this.client.subscribeBalance.bind(this.client), mapper);
    return alwaysRetry(this.channel, call, protoRequest, this.retries);
  }

  public getBalance(request: BalanceRequest): Promise<Array<AddressBalance>> {
    const protoRequest = this.convert.balanceRequest(request);
    const mapper: DataMapper<ProtoAddressBalance, AddressBalance> = this.convert.balanceResponse();

    const call = callStream(this.client.getBalance.bind(this.client), mapper);
    return publishListToPromise(readOnce(this.channel, call, protoRequest, this.retries));
  }

  public subscribeTxStatus(request: TxStatusRequest): Publisher<TxStatusResponse> {
    const protoRequest = this.convert.txRequest(request);
    const mapper: DataMapper<ProtoTxStatus, TxStatusResponse> = this.convert.txResponse();

    const call = callStream(this.client.subscribeTxStatus.bind(this.client), mapper);
    return readOnce(this.channel, call, protoRequest, this.retries);
  }

  public estimateFees(request: EstimateFeeRequest): Promise<EstimateFeeResponse> {
    const protoRequest = this.convert.estimateFeeRequest(request);
    const mapper: DataMapper<ProtoEstimateFeeResponse, EstimateFeeResponse> = this.convert.estimateFeeResponse();

    const call = callSingle(this.client.estimateFee.bind(this.client), mapper);
    return publishToPromise(readOnce(this.channel, call, protoRequest, this.retries));
  }

}

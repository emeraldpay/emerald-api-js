export {GetRateRequest, GetRateReply, GetRateReplyItem} from './generated/prices_pb';
export {IPricesClient, PricesClient} from './generated/prices_grpc_pb';

export {CallBlockchainRequest, CallBlockchainItem, CallBlockchainReplyItem} from './generated/blockchain_pb';
export {IBlockchainClient, BlockchainClient} from './generated/blockchain_grpc_pb'

export { credentials } from 'grpc';
import { MessageFactory } from '@emeraldpay/api';
import * as address_message_pb from '../generated/address.message_pb';
import * as blockchain_pb from '../generated/blockchain_pb';
import * as common_pb from '../generated/common_pb';
import * as market_pb from '../generated/market_pb';
import * as token_message_pb from '../generated/token.message_pb';
import * as transaction_message_pb from '../generated/transaction.message_pb';
import * as auth_message_pb from '../generated/auth_pb';

export const classFactory: MessageFactory = (id: string) => {
  switch (id) {
    // Common
    case 'common_pb.AnyAddress':
      return new common_pb.AnyAddress();
    case 'common_pb.Asset':
      return new common_pb.Asset();
    case 'common_pb.Chain':
      return new common_pb.Chain();
    case 'common_pb.Erc20Asset':
      return new common_pb.Erc20Asset();
    case 'common_pb.MultiAddress':
      return new common_pb.MultiAddress();
    case 'common_pb.SingleAddress':
      return new common_pb.SingleAddress();
    case 'common_pb.XpubAddress':
      return new common_pb.XpubAddress();
    // Auth
    case 'auth_pb.RefreshRequest':
      return new auth_message_pb.RefreshRequest();
    case 'auth_pb.AuthRequest':
      return new auth_message_pb.AuthRequest();
    case 'auth_pb.AuthResponse':
      return new auth_message_pb.AuthResponse();
    // Address
    case 'address_message_pb.DescribeRequest':
      return new address_message_pb.DescribeRequest();
    case 'address_message_pb.DescribeXpubRequest':
      return new address_message_pb.DescribeXpubRequest();
    // Blockchain
    case 'blockchain_pb.AddressBalance':
      return new blockchain_pb.AddressBalance();
    case 'blockchain_pb.BalanceRequest':
      return new blockchain_pb.BalanceRequest();
    case 'blockchain_pb.EstimateFeeRequest':
      return new blockchain_pb.EstimateFeeRequest();
    case 'blockchain_pb.NativeCallItem':
      return new blockchain_pb.NativeCallItem();
    case 'blockchain_pb.NativeCallRequest':
      return new blockchain_pb.NativeCallRequest();
    case 'blockchain_pb.TxStatus':
      return new blockchain_pb.TxStatus();
    case 'blockchain_pb.TxStatusRequest':
      return new blockchain_pb.TxStatusRequest();
    // Market
    case 'market_pb.GetRatesRequest':
      return new market_pb.GetRatesRequest();
    case 'market_pb.Pair':
      return new market_pb.Pair();
    // Token
    case 'token_message_pb.AddressAllowanceRequest':
      return new token_message_pb.AddressAllowanceRequest();
    case 'token_message_pb.AddressTokenRequest':
      return new token_message_pb.AddressTokenRequest();
    // Transaction
    case 'transaction_message_pb.GetTransactionsRequest':
      return new transaction_message_pb.GetTransactionsRequest();
    case 'transaction_message_pb.SubscribeTransactionsRequest':
      return new transaction_message_pb.SubscribeTransactionsRequest();
    default:
      throw Error(`Unsupported type: ${id}`);
  }
};

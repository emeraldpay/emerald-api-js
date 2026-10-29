import * as token_message_pb from './generated/token.message_pb';
import { DataMapper } from './Publisher';
import { AnyAddress, Blockchain, ConvertCommon, SingleAddress, } from './typesCommon';
import { MessageFactory, required } from './typesConvert';

export interface AddressTokenRequest {
  blockchain: Blockchain;
  address: AnyAddress;
  contractAddresses: string[];
}

export interface AddressToken  {
  blockchain: Blockchain;
  address: AnyAddress;
  contractAddresses: string[];
}

export interface AddressAllowanceRequest {
  blockchain: Blockchain;
  address: AnyAddress;
  contractAddresses: string[];
  cursor?: string;
  limit?: number;
}

export interface AddressAllowanceToken {
  blockchain: Blockchain;
  address: SingleAddress;
  approvedByAddress: string[];
  approvedForAddress: string[];
}

export interface AddressAllowanceAmount {
  address: SingleAddress;
  allowance: string;
  available: string;
  blockchain: Blockchain;
  contractAddress: SingleAddress;
  ownerAddress: SingleAddress;
  spenderAddress: SingleAddress;
}

export class Convert {
  private readonly factory: MessageFactory;
  private readonly common: ConvertCommon;

  constructor(factory: MessageFactory, common: ConvertCommon = new ConvertCommon(factory)) {
    this.factory = factory;
    this.common = common;
  }

  public addressTokenRequest(req: AddressTokenRequest): token_message_pb.AddressTokenRequest {
    const result: token_message_pb.AddressTokenRequest = this.factory(
      'token_message_pb.AddressTokenRequest',
    );

    return result
      .setChain(req.blockchain.valueOf())
      .setAddress(this.common.pbAnyAddress(req.address))
      .setContractAddressesList(req.contractAddresses.map((value) => this.common.pbSingleAddress(value)));
  }

  public addressToken(): DataMapper<token_message_pb.AddressToken, AddressToken> {
    return (resp) => {
      const contractAddresses = resp.getContractAddressesList().map((value) => value.getAddress());

      return {
        blockchain: resp.getChain().valueOf(),
        address: required(resp.getAddress(), 'address').getAddress(),
        contractAddresses: contractAddresses,
      };
    };
  }

  public addressAllowanceRequest(req: AddressAllowanceRequest): token_message_pb.AddressAllowanceRequest {
    const result: token_message_pb.AddressAllowanceRequest = this.factory(
      'token_message_pb.AddressAllowanceRequest',
    );

    result
      .setChain(req.blockchain.valueOf())
      .setAddress(this.common.pbAnyAddress(req.address))
      .setContractAddressesList(req.contractAddresses.map((value) => this.common.pbSingleAddress(value)));
    if (req.cursor != null) {
      result.setCursor(req.cursor);
    }
    if (req.limit != null) {
      result.setLimit(req.limit);
    }
    return result;
  }

  public addressAllowanceToken(): DataMapper<token_message_pb.AddressAllowanceToken, AddressAllowanceToken> {
    return (resp) => {
      const approvedByAddress = resp.getApprovedByAddressList().map((value) => value.getAddress());
      const approvedForAddress = resp.getApprovedForAddressList().map((value) => value.getAddress());

      return {
        blockchain: resp.getChain().valueOf(),
        address: required(resp.getAddress(), 'address').getAddress(),
        approvedByAddress: approvedByAddress,
        approvedForAddress: approvedForAddress,
      };
    };
  }

  public addressAllowanceAmount(): DataMapper<token_message_pb.AddressAllowanceAmount, AddressAllowanceAmount> {
    return (response) => {
      const cursor = response.getCursor();

      return {
        blockchain: response.getChain().valueOf(),
        address: required(response.getAddress(), 'address').getAddress(),
        allowance: response.getAllowance(),
        available: response.getAvailable(),
        chain: response.getChain().valueOf(),
        contractAddress: required(response.getContractAddress(), 'contract address').getAddress(),
        ownerAddress: required(response.getOwnerAddress(), 'owner address').getAddress(),
        spenderAddress: required(response.getSpenderAddress(), 'spender address').getAddress(),
        cursor: cursor.length > 0 ? cursor : undefined,
      };
    };
  }


}

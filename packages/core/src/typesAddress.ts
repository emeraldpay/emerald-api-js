import * as address_message_pb from './generated/address.message_pb';
import { DataMapper } from './Publisher';
import { Blockchain, ConvertCommon, SingleAddress, XpubAddress } from './typesCommon';
import { MessageFactory } from './typesConvert';

export enum AddressCapability {
  ERC20 = 'erc20',
}

export enum AddressControl {
  CONTRACT = 'contract',
  PERSON = 'person',
}

export interface DescribeRequest {
  address: SingleAddress;
  blockchain: Blockchain;
}

export interface DescribeResponse {
  active: boolean;
  address: SingleAddress;
  capabilities: AddressCapability[];
  control?: AddressControl;
}

export interface DescribeXpubRequest {
  blockchain: Blockchain;
  address: XpubAddress;
}

export interface DescribeXpubResponse {
  blockchain: Blockchain;
  address: XpubAddress;
  lastAddress?: SingleAddress;
  lastIndex?: number;
}

export class ConvertAddress {
  private readonly factory: MessageFactory;
  private readonly common: ConvertCommon;

  constructor(factory: MessageFactory, common: ConvertCommon = new ConvertCommon(factory)) {
    this.factory = factory;
    this.common = common;
  }

  describeRequest({ address, blockchain }: DescribeRequest): address_message_pb.DescribeRequest {
    const result: address_message_pb.DescribeRequest = this.factory('address_message_pb.DescribeRequest');
    return result.setAddress(this.common.pbSingleAddress(address)).setChain(blockchain.valueOf());
  }

  describeResponse(): DataMapper<address_message_pb.DescribeResponse, DescribeResponse> {
    return (response) => ({
      active: response.getActive(),
      address: response.getAddress().getAddress(),
      capabilities: response
        .getCapabilitiesList()
        .map(this.convertAddressCapability)
        .filter((capability) => capability != null),
      control: this.convertAddressControl(response.getControl()),
    });
  }

  public describeXpubRequest(req: DescribeXpubRequest): address_message_pb.DescribeXpubRequest {
    const result: address_message_pb.DescribeXpubRequest = this.factory('address_message_pb.DescribeXpubRequest');
    return result.setChain(req.blockchain.valueOf()).setAddress(this.common.pbXpubAddress(req.address));
  }

  public describeXpubResponse(): DataMapper<address_message_pb.DescribeXpubResponse, DescribeXpubResponse> {
    return (response) => ({
        blockchain: response.getChain().valueOf(),
        address: response.getAddress().getXpub(),
        lastAddress: response.hasLastAddress() ? response.getLastAddress().getAddress() : undefined,
        lastIndex: response.hasLastIndex() ? response.getLastIndex().getValue() : undefined,
    });
  }

  private convertAddressCapability(capability: address_message_pb.AddressCapability): AddressCapability | undefined {
    switch (capability) {
      case address_message_pb.AddressCapability.CAP_ERC20:
        return AddressCapability.ERC20;
      default:
        return undefined;
    }
  }

  private convertAddressControl(control: address_message_pb.AddressControl): AddressControl | undefined {
    switch (control) {
      case address_message_pb.AddressControl.CTRL_CONTRACT:
        return AddressControl.CONTRACT;
      case address_message_pb.AddressControl.CTRL_PERSON:
        return AddressControl.PERSON;
      default:
        return undefined;
    }
  }
}

import { AddressCapability, DescribeRequest, DescribeResponse } from './generated/address.message_pb';
import { DataMapper } from './Publisher';
import { Blockchain, ConvertCommon, SingleAddress } from './typesCommon';
import { MessageFactory } from './typesConvert';

export enum DescribeAddressCapability {
  ERC20 = 'erc20',
}

export enum DescribeAddressControl {
  CONTRACT = 'contract',
  PERSON = 'person',
}

export interface DescribeAddressRequest {
  address: SingleAddress;
  chain: Blockchain;
}

export interface DescribeAddressResponse {
  active: boolean;
  address: SingleAddress;
  capabilities: DescribeAddressCapability[];
  control?: DescribeAddressControl;
}

export class ConvertDescribeAddress {
  private readonly factory: MessageFactory;
  private readonly common: ConvertCommon;

  constructor(factory: MessageFactory, common: ConvertCommon = new ConvertCommon(factory)) {
    this.factory = factory;
    this.common = common;
  }

  addressRequest({ address, chain }: DescribeAddressRequest): DescribeRequest {
    const result: DescribeRequest = this.factory('address_message_pb.DescribeRequest');

    return result.setAddress(this.common.pbSingleAddress(address)).setChain(chain.valueOf());
  }

  addressResponse(): DataMapper<DescribeResponse, DescribeAddressResponse> {
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

  private convertAddressCapability(capability: AddressCapability): DescribeAddressCapability | undefined {
    switch (capability) {
      case AddressCapability.CAP_ERC20:
        return DescribeAddressCapability.ERC20;
      default:
        return undefined;
    }
  }

  private convertAddressControl(control: DescribeResponse.AddrControl): DescribeAddressControl | undefined {
    switch (control) {
      case DescribeResponse.AddrControl.CTRL_CONTRACT:
        return DescribeAddressControl.CONTRACT;
      case DescribeResponse.AddrControl.CTRL_PERSON:
        return DescribeAddressControl.PERSON;
      default:
        return undefined;
    }
  }
}

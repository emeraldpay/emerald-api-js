import { AddressCapability, DescribeRequest, DescribeResponse } from './generated/address.message_pb';
import { DataMapper } from './Publisher';
import { Blockchain, ConvertCommon, SingleAddress } from './typesCommon';
import { MessageFactory } from './typesConvert';

export interface DescribeAddressRequest {
  address: SingleAddress;
  chain: Blockchain;
}

export interface DescribeAddressResponse {
  active: boolean;
  address: SingleAddress;
  capabilities: AddressCapability[];
  control: DescribeResponse.AddrControl;
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
      capabilities: response.getCapabilitiesList(),
      control: response.getControl(),
    });
  }
}

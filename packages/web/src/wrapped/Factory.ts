import {MessageFactory} from "@emeraldpay/api-client-core";
import * as common_pb from "../generated/common_pb";
import * as blockchain_pb from "../generated/blockchain_pb";

export const classFactory: MessageFactory = (id: string) => {
    if (id == "common_pb.Chain") {
        return new common_pb.Chain();
    }
    if (id == "common_pb.Asset") {
        return new common_pb.Asset();
    }
    if (id == "common_pb.AnyAddress") {
        return new common_pb.AnyAddress();
    }
    if (id == "common_pb.SingleAddress") {
        return new common_pb.SingleAddress();
    }
    if (id == "common_pb.MultiAddress") {
        return new common_pb.MultiAddress();
    }


    if (id == "blockchain_pb.NativeCallRequest") {
        return new blockchain_pb.NativeCallRequest();
    }
    if (id == "blockchain_pb.NativeCallItem") {
        return new blockchain_pb.NativeCallItem();
    }
    if (id == "blockchain_pb.AddressBalance") {
        return new blockchain_pb.AddressBalance();
    }
    if (id == "blockchain_pb.BalanceRequest") {
        return new blockchain_pb.BalanceRequest();
    }
    if (id == "blockchain_pb.TxStatusRequest") {
        return new blockchain_pb.TxStatusRequest();
    }
    if (id == "blockchain_pb.TxStatus") {
        return new blockchain_pb.TxStatus();
    }

    throw Error("Unsupported type: " + id)
};
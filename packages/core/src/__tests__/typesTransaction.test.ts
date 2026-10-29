import {UInt32Value} from "google-protobuf/google/protobuf/wrappers_pb";
import * as common_pb from "../generated/common_pb";
import * as transaction_message_pb from "../generated/transaction.message_pb";
import {Blockchain} from "../typesCommon";
import {MessageFactory} from "../typesConvert";
import {ConvertTransaction} from "../typesTransaction";

const factory: MessageFactory = (id: string) => {
    switch (id) {
        case 'transaction_message_pb.GetTransactionsRequest':
            return new transaction_message_pb.GetTransactionsRequest();
        case 'common_pb.AnyAddress':
            return new common_pb.AnyAddress();
        case 'common_pb.SingleAddress':
            return new common_pb.SingleAddress();
        default:
            throw Error(`Unsupported type ${id}`);
    }
};
const converter = new ConvertTransaction(factory);

const address = "0xdac17f958d2ee523a2206206994597c13d831ec7";

describe("getTransactionsRequest", () => {

    test("with cursor and limit", () => {
        const act = converter.getTransactionsRequest({
            blockchain: Blockchain.ETHEREUM,
            address,
            cursor: "test-cursor",
            limit: 10,
        });

        expect(act.getCursor()).toBe("test-cursor");
        expect(act.getLimit()).toBe(10);
    });

    test("without cursor and limit", () => {
        const act = converter.getTransactionsRequest({
            blockchain: Blockchain.ETHEREUM,
            address,
        });

        expect(act.getCursor()).toBe("");
        expect(act.getLimit()).toBe(0);
        // nothing extra is sent
        expect(act.serializeBinary()).toEqual(
            converter.getTransactionsRequest({blockchain: Blockchain.ETHEREUM, address, cursor: undefined, limit: undefined}).serializeBinary(),
        );
    });
});

describe("addressTransaction", () => {

    test("converts with all optional fields", () => {
        const response = new transaction_message_pb.AddressTransaction()
            .setChain(common_pb.ChainRef.CHAIN_ETHEREUM)
            .setAddress(new common_pb.SingleAddress().setAddress(address))
            .setXpubIndex(new UInt32Value().setValue(3))
            .setTxId("0x1234")
            .setBlock(new common_pb.BlockInfo().setHeight(100).setBlockId("0xabcd").setTimestamp(1700000000000))
            .setCursor("next")
            .setChangesList([
                new transaction_message_pb.Change()
                    .setAddress(new common_pb.SingleAddress().setAddress(address))
                    .setContractAddress(new common_pb.SingleAddress().setAddress("0x6b175474e89094c44da98b954eedeac495271d0f"))
                    .setXpubIndex(new UInt32Value().setValue(5))
                    .setAmount("1000"),
            ]);

        const act = converter.addressTransaction()(response);

        expect(act.address).toBe(address);
        expect(act.xpubIndex).toBe(3);
        expect(act.block).toEqual({height: 100, hash: "0xabcd", timestamp: new Date(1700000000000)});
        expect(act.cursor).toBe("next");
        expect(act.changes[0].address).toBe(address);
        expect(act.changes[0].contractAddress).toBe("0x6b175474e89094c44da98b954eedeac495271d0f");
        expect(act.changes[0].xpubIndex).toBe(5);
    });

    test("converts without optional fields", () => {
        const response = new transaction_message_pb.AddressTransaction()
            .setChain(common_pb.ChainRef.CHAIN_ETHEREUM)
            .setAddress(new common_pb.SingleAddress().setAddress(address))
            .setTxId("0x1234")
            .setMempool(true)
            .setChangesList([
                new transaction_message_pb.Change()
                    .setAmount("1000"),
            ]);

        const act = converter.addressTransaction()(response);

        expect(act.xpubIndex).toBeUndefined();
        expect(act.block).toBeUndefined();
        expect(act.cursor).toBeUndefined();
        expect(act.mempool).toBeTruthy();
        expect(act.changes[0].address).toBeUndefined();
        expect(act.changes[0].contractAddress).toBeUndefined();
        expect(act.changes[0].xpubIndex).toBeUndefined();
    });

    test("fails without address", () => {
        const response = new transaction_message_pb.AddressTransaction()
            .setChain(common_pb.ChainRef.CHAIN_ETHEREUM)
            .setTxId("0x1234");

        expect(() => converter.addressTransaction()(response)).toThrow("Invalid response: no address");
    });
});

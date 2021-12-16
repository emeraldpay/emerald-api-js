import {ConvertBlockchain, isBitcoinStdFees, isEthereumExtFees, isEthereumStdFees} from "../typesBlockchain";
import * as blockchain_pb from "../generated/blockchain_pb";

describe("Estimate Fee", () => {

    let factory = (id: string) => {
        if (id == "blockchain_pb.EstimateFeeRequest") {
            return new blockchain_pb.EstimateFeeRequest();
        }
        throw Error(`Unsupported type ${id}`)
    }
    let converter = new ConvertBlockchain(factory)

    test("isEthereumStdFees", () => {
        expect(
            isEthereumStdFees({type: "ethereumStd", fee: "100000"})
        ).toBeTruthy();

        expect(
            isEthereumStdFees({type: "ethereumExt", expect: "10000", max: "20000", priority: "150"})
        ).toBeFalsy();

        expect(
            isEthereumStdFees({type: "bitcoinStd", satPerKb: 1234})
        ).toBeFalsy();
    });

    test("isEthereumExtFees", () => {
        expect(
            isEthereumExtFees({type: "ethereumStd", fee: "100000"})
        ).toBeFalsy();

        expect(
            isEthereumExtFees({type: "ethereumExt", expect: "10000", max: "20000", priority: "150"})
        ).toBeTruthy();

        expect(
            isEthereumExtFees({type: "bitcoinStd", satPerKb: 1234})
        ).toBeFalsy();
    });

    test("isBitcoinStdFees", () => {
        expect(
            isBitcoinStdFees({type: "ethereumStd", fee: "100000"})
        ).toBeFalsy();

        expect(
            isBitcoinStdFees({type: "ethereumExt", expect: "10000", max: "20000", priority: "150"})
        ).toBeFalsy();

        expect(
            isBitcoinStdFees({type: "bitcoinStd", satPerKb: 1234})
        ).toBeTruthy();
    });

    test("convert request", () => {
        let act = converter.estimateFeeRequest({
            blockchain: 100,
            mode: "avgMiddle",
            blocks: 50
        });

        expect(act).toBeDefined();
        expect(act.getMode().valueOf()).toBe(6);
        expect(act.getChain().valueOf()).toBe(100);
        expect(act.getBlocks()).toBe(50)
    });

    test("convert response - Ethereum Std", () => {
        let fees = new blockchain_pb.EthereumStdFees();
        fees.setFee("1000000");

        let resp = new blockchain_pb.EstimateFeeResponse()
        resp.setEthereumstd(fees)

        let act = converter.estimateFeeResponse()(resp);

        expect(act).toBeDefined();
        expect(isEthereumStdFees(act)).toBeTruthy();
        if (!isEthereumStdFees(act)) {
            return;
        }
        expect(act.fee).toBe("1000000");
    });

    test("convert response - Ethereum Ext", () => {
        let fees = new blockchain_pb.EthereumExtFees();
        fees.setExpect("100");
        fees.setMax("200")
        fees.setPriority("15");

        let resp = new blockchain_pb.EstimateFeeResponse()
        resp.setEthereumextended(fees)

        let act = converter.estimateFeeResponse()(resp);

        expect(act).toBeDefined();
        expect(isEthereumExtFees(act)).toBeTruthy();
        if (!isEthereumExtFees(act)) {
            return;
        }
        expect(act.expect).toBe("100");
        expect(act.max).toBe("200");
        expect(act.priority).toBe("15");
    });

    test("convert response - Bitcoin Std", () => {
        let fees = new blockchain_pb.BitcoinStdFees();
        fees.setSatperkb(1234);

        let resp = new blockchain_pb.EstimateFeeResponse()
        resp.setBitcoinstd(fees)

        let act = converter.estimateFeeResponse()(resp);

        expect(act).toBeDefined();
        expect(isBitcoinStdFees(act)).toBeTruthy();
        if (!isBitcoinStdFees(act)) {
            return;
        }
        expect(act.satPerKb).toBe(1234);
    });

    test("convert mode", () => {
        expect(
            converter.estimationMode("minAlways")
        ).toBe(
            blockchain_pb.FeeEstimationMode.MIN_ALWAYS
        );
        expect(
            converter.estimationMode("avgMiddle")
        ).toBe(
            blockchain_pb.FeeEstimationMode.AVG_MIDDLE
        );
        expect(
            converter.estimationMode("avgLast")
        ).toBe(
            blockchain_pb.FeeEstimationMode.AVG_LAST
        );
        expect(
            converter.estimationMode("avgTop")
        ).toBe(
            blockchain_pb.FeeEstimationMode.AVG_TOP
        );
        expect(
            converter.estimationMode("avgTail5")
        ).toBe(
            blockchain_pb.FeeEstimationMode.AVG_T5
        );
        expect(
            converter.estimationMode("avgTail20")
        ).toBe(
            blockchain_pb.FeeEstimationMode.AVG_T20
        );
        expect(
            converter.estimationMode("avgTail50")
        ).toBe(
            blockchain_pb.FeeEstimationMode.AVG_T50
        );
    });
})
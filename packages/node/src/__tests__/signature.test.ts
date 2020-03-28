import {TokenSignature} from "../signature";

test('Valid signature', () => {
    let signature = new TokenSignature(
        '101e373298335ffad92fab40cd36966bd069efb166960d2b88657015a2eae2b8',
        '53ebc2443caaa469a0e092a5b1c11b17fcccae509e3837e46938f5938b26b319'
    );
    jest.spyOn(Date, 'now').mockImplementation(() => 1559357000000);

    //verify with:
    //$ echo -n "1559357000000-1" | openssl dgst -sha256 -hmac "53ebc2443caaa469a0e092a5b1c11b17fcccae509e3837e46938f5938b26b319"

    let next = signature.next();
    expect(next.token).toBe('101e373298335ffad92fab40cd36966bd069efb166960d2b88657015a2eae2b8');
    expect(next.msg).toBe('1559357000000-1');
    expect(next.signature).toBe('3de9320dc4345bf434e32b1ecaa59228ffbab1c626e15812e61ec722b82e8544');

    next = signature.next();
    expect(next.token).toBe('101e373298335ffad92fab40cd36966bd069efb166960d2b88657015a2eae2b8');
    expect(next.msg).toBe('1559357000000-2');
    expect(next.signature).toBe('3bff0ba8d1b3658189cb978d3727af43c59833cba03a348f3a04f4c92817787a');

    next = signature.next();
    expect(next.token).toBe('101e373298335ffad92fab40cd36966bd069efb166960d2b88657015a2eae2b8');
    expect(next.msg).toBe('1559357000000-3');
    expect(next.signature).toBe('1dd05014b7e5b76b8e2116e342541643159a741cf88ed5af98d78df59ce56e0f');

    next = signature.next();
    expect(next.token).toBe('101e373298335ffad92fab40cd36966bd069efb166960d2b88657015a2eae2b8');
    expect(next.msg).toBe('1559357000000-4');
    expect(next.signature).toBe('3bfaaf1e9fe0f5ca69dae09089c8076f4d60856adb7767a5665aa6fb698704d4');
});
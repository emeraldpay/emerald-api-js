export type ChainHead = {
    chain: number;
    height: number;
    blockId: string;
    timestamp: Date;
}

export type NativeCallItem = {
    id: number;
    method: string;
    payload: any
}

export type NativeCallResponse = {
    id: number;
    payload: any;
    success: boolean;
}

export type NativeCallError = {
    id: number;
    success: boolean;
}
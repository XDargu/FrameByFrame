export enum MessageType {
    Save,
    Open,
    OpenResult,
    Clear,
    ClearResult
}

export interface IClearResultData
{
    clear: boolean;
    remember: boolean;
}

export class Message
{
    public type: MessageType;
    public data: string | IClearResultData;

    constructor(type: MessageType, data: string | IClearResultData)
    {
        this.type = type;
        this.data = data;
    }
}
export enum MessageType {
    Save,
    Open,
    OpenResult
}

export class Message
{
    public type: MessageType;
    public data: string;

    constructor(type: MessageType, data: string)
    {
        this.type = type;
        this.data = data;
    }
}
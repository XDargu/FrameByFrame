export enum MessageType { // TODO: Maybe rename these to make clear the direction of the messge (main->render or render->main)
    RequestSave,
    Save,
    Load, // Load specific file
    Open, // Open file prompt
    OpenResult,
    Clear,
    ClearResult,
    UpdateRecentFiles,
    LogToConsole,
    LogErrorToConsole
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
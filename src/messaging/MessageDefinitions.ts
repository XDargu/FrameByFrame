import { ISettings } from "../files/FileManager";
import { ConsoleWindow, LogLevel, ILogAction, LogChannel } from "../frontend/ConsoleController";

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
    FileOpened,
    SettingsChanged
}

export interface IClearResultData
{
    clear: boolean;
    remember: boolean;
}

export interface ILogData
{
    message: (string | ILogAction)[];
    level: LogLevel;
    channel: LogChannel;
}

export class Message
{
    public type: MessageType;
    public data: string | IClearResultData | ILogData | ISettings;

    constructor(type: MessageType, data: string | IClearResultData | ILogData | ISettings)
    {
        this.type = type;
        this.data = data;
    }
}
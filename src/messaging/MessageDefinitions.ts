import { ISettings } from "../files/Settings";
import { ConsoleWindow, LogLevel, ILogAction, LogChannel } from "../frontend/ConsoleController";

export enum MessageType { // TODO: Maybe rename these to make clear the direction of the messge (main->render or render->main)
    RequestSave,
    RequestSavePath,
    SavePathResult,
    SaveToFile,
    Load, // Load specific file
    Open, // Open file prompt
    OpenResult,
    Clear,
    ClearResult,
    UpdateRecentFiles,
    LogToConsole,
    FileOpened,
    SettingsChanged,
    SaveSettings,
    LongOperationOngoing,
    OpenInExplorer
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

export interface IRequestSavePathData
{
    defaultName: string;
}

export interface ISaveFileData
{
    content: string;
    path: string;
}

type MessageData = string | IClearResultData | ILogData | ISettings | ISaveFileData | IRequestSavePathData;
export class Message
{
    public type: MessageType;
    public data: MessageData;

    constructor(type: MessageType, data: MessageData)
    {
        this.type = type;
        this.data = data;
    }
}
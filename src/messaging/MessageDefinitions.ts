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
    OpenInExplorer,
    RequestExportFilters,
    RequestImportFilters,
    ImportFiltersResult,
    ModFileOpened,
    DownloadResource,
    OpenWindowRequest,
    OpenWindowResult,
    UpdateWindow,

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
    askForPartialSave: boolean;
}

export interface IResultSavePathData
{
    path: string;
    saveOnlySelection: boolean;
}

export interface ISaveFileData
{
    content: string;
    path: string;
}

export interface IDownloadResource
{
    content: string;
    type: string;
    name: string;
}

export enum EUserWindowType
{
    Image,
    Text,
    PropertyGroup
}

export interface IOpenWindowRequest
{
    type: EUserWindowType;
    requestId: number;
}

export interface IUpdateWindowsContent
{
    id: number;
    type: EUserWindowType;
    content: string;
}

export interface IOpenWindowResult
{
    id: number;
    requestId: number;
}

type MessageData = string | IClearResultData | ILogData | ISettings | ISaveFileData | IRequestSavePathData | IResultSavePathData | IDownloadResource | IOpenWindowRequest | IOpenWindowResult | IUpdateWindowsContent;
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
import { GitHubRelease } from "../updates/gitHub";
import { ISettings } from "../files/Settings";
import { LogLevel, ILogAction, LogChannel } from "../frontend/ConsoleController";
import * as RECORDING from '../recording/RecordingData';

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
    OpenResource,
    OpenWindowRequest,
    OpenWindowResult,
    UpdateWindow,
    CloseWindow,
    CloseAllWindows,
    WindowsClosed,
    // Updates
    UpdateResult, // Main to Renderer
    UpdateInstallFailed, // Main to Renderer
    RequestCheckForUpdates, // Renderer to Main
    RequestInstallUpdate, // Renderer to Main
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

export interface IOpenResource
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
    title: string;
    width: number;
    height: number;
}

export interface IPropertyGroupData
{
    group: RECORDING.IPropertyGroup;
    tag: string;
    name: string;
}

export interface IUpdateWindowsContent
{
    id: number;
    type: EUserWindowType;
    content: string | IPropertyGroupData;
    title: string;
}

export interface ICloseWindowRequest
{
    id: number;
}

export interface IOpenWindowResult
{
    id: number;
    requestId: number;
}

export interface IWindowsClosed
{
    id: number;
}

export interface IUpdateResult
{
    available: boolean,
    version: string,
    release?: GitHubRelease,
    error?: string,
    downloadUrl?: string,
}

type MessageData = string | IClearResultData | ILogData | ISettings | ISaveFileData | IRequestSavePathData | IResultSavePathData | IDownloadResource | IOpenResource | IOpenWindowRequest | IOpenWindowResult | IUpdateWindowsContent | IWindowsClosed | ICloseWindowRequest | IUpdateResult;
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
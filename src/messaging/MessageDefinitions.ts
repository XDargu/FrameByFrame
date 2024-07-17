import { ISettings } from "../files/Settings";
import * as FileRec from "../recording/FileRecording";
import * as FrameLoader from "../recording/FrameLoader";
import { ConsoleWindow, LogLevel, ILogAction, LogChannel } from "../frontend/ConsoleController";

export enum MessageType { // TODO: Maybe rename these to make clear the direction of the messge (main->render or render->main)
    RequestSave,
    RequestSavePath,
    SavePathResult,
    SaveToFileRequest, // ISaveFileData
    SaveToFileResult, // empty
    Load, // Load specific file
    Open, // Open file prompt
    OpenResult, // IOpenFileResult
    Clear,
    ClearResult, // IClearResultData
    UpdateRecentFiles,
    LogToConsole,
    SettingsChanged,
    SaveSettings,
    LongOperationOngoing,
    OpenInExplorer,
    RequestExportFilters,
    RequestImportFilters,
    ImportFiltersResult,
    ModFileOpened,
    RequestConvertNaiveRecording, // IRequestConvertRecording
    RequestLoadFrameChunks, // ILoadFrameChunksRequest
    LoadFrameChunksResult, // ILoadFrameChunksResult
    RequestExportChunk, // IChunkExportRequest
    RequestExportGlobalData, // IGlobalDataExportRequest
}

export interface IGlobalDataExportRequest
{
    globalData: FileRec.GlobalData
}

export interface IChunkExportRequest
{
    offset: number,
    chunk: Buffer // Buffer of RECORDING.IFrameData[]
}

export interface ILoadFrameChunksResult
{
    id: number,
    chunk: Buffer // Buffer of RECORDING.IFrameData[]
}

export interface ILoadFrameChunksRequest
{
    id: number,
    relativePath: string
}

export interface IRequestConvertRecording
{
    data: string
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
    globalData: FileRec.GlobalData;
    lastChunk: Buffer | null;  // Buffer of RECORDING.IFrameData[]
    lastChunkOffset: number | null;
    path: string;
}

export interface IOpenFileResult
{
    isZip: boolean,
    data: string | FileRec.IFileRecording;
    path: string;
}

type MessageData = string | IClearResultData | ILogData | ISettings | ISaveFileData | IRequestSavePathData | IResultSavePathData | IOpenFileResult | IRequestConvertRecording | ILoadFrameChunksRequest | ILoadFrameChunksResult | IChunkExportRequest | IGlobalDataExportRequest;
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
import { ISettings } from "../files/Settings";
import * as FileRec from "../recording/FileRecording";
import * as RECORDING from "../recording/RecordingDefinitions";
import { ConsoleWindow, LogLevel, ILogAction, LogChannel } from "../frontend/ConsoleController";

export enum MessageType { // TODO: Maybe rename these to make clear the direction of the messge (main->render or render->main)
    RequestSave,
    RequestSavePath,
    SavePathResult,
    SaveToFile,
    Load, // Load specific file
    Open, // Open file prompt
    OpenResult, // IOpenFileResult
    Clear,
    ClearResult,
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

export interface IOpenFileResult
{
    isZip: boolean,
    data: string | FileRec.FileRecording;
    path: string;
}

type MessageData = string | IClearResultData | ILogData | ISettings | ISaveFileData | IRequestSavePathData | IResultSavePathData | IOpenFileResult;
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
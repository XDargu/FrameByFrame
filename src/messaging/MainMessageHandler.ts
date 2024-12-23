import { BrowserWindow } from "electron";
import { ipcMain, dialog } from "electron";
import * as path from "path";
import { ISettings } from "../files/Settings";
import * as Messaging from "../messaging/MessageDefinitions";
import * as UserWindowUtils from "../mainThread/userWindowUtils";
import { fileManager, sessionOptions } from "../main";

const shell = require('electron').shell;

function requestSavePath(event: any, request: Messaging.IRequestSavePathData)
{
    const requestSave = (saveOnlySelection: boolean) =>
    {
        fileManager.getRecordingSaveLocation(request.defaultName, (path: string) => {
        event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.SavePathResult, {
            path: path,
            saveOnlySelection: saveOnlySelection
        }));
        });
    }

    if (request.askForPartialSave)
    {
        const options = {
        type: 'question',
        buttons: ['Save selection', 'Save all'],
        defaultId: 0,
        title: 'Save data',
        message: 'Save only the selection or all data?',
        detail: 'You have a partial selection of the recording. Do you want to save only the selected data, or the entire recording?',
        };
    
        dialog.showMessageBox(null, options, (response) => {
        const saveOnlySelection: boolean = response == 0;
        const saveAll: boolean = response == 1;

        if (saveOnlySelection || saveAll)
        {
            requestSave(saveOnlySelection);
        }
        });
    }
    else
    {
        requestSave(false);
    }
}

function saveToFile(event: any, fileSaveData: Messaging.ISaveFileData)
{
    fileManager.saveRecordingToFile(fileSaveData.path, fileSaveData.content)
}

function load(event: any, filePath: string)
{
    try
    {
        if (fileManager.doesFileExist(filePath))
        {
            fileManager.loadRecordingFile(filePath, (pathName: string, content: string) =>
            {
                event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.FileOpened, pathName));
                event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.OpenResult, content));
            });
        }
        else
        {
            const options : Electron.MessageBoxOptions =
            {
                type: 'question',
                buttons: ['Keep file', 'Remove from recent'],
                title: 'File does not exist',
                message: 'Looks like the file has been removed. Do you want to remove it from the recent file list?',
            };

            dialog.showMessageBox(null, options, (response) =>
            {
                const souldRemove: boolean = response == 1;
                if (souldRemove)
                {
                    fileManager.removePathFromHistory(filePath);
                }
            });

            event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.OpenResult, null));
        }
    }
    catch(err)
    {
        const options : Electron.MessageBoxOptions =
        {
            type: 'error',
            buttons: ['OK'],
            title: 'Error reading file',
            message: 'An error ocurred reading the file',
            detail: err.message,
            checkboxChecked: false,
        };

        dialog.showMessageBox(null, options);
        event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.OpenResult, null));
    }
}

function open(event: any)
{
    fileManager.openRecordingsFile((pathName: string, content: string) =>
    {
        event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.FileOpened, pathName));
        event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.OpenResult, content));
    }, () =>
    {
        event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.LongOperationOngoing, "Opening File"));
    });
}

function clear(event: any)
{
    if (!sessionOptions.showClearDataDialog)
    {
        event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.ClearResult, {clear: true, remember: true}));
        return;
    }

    const options : Electron.MessageBoxOptions =
    {
        type: 'warning',
        buttons: ['Remove data', 'Cancel'],
        defaultId: 2,
        title: 'Remove data',
        message: 'Are you sure you want to remove all existing data?',
        detail: 'This will remove all recorded data',
        checkboxLabel: "Don't ask again",
        checkboxChecked: false,
    };
    
    dialog.showMessageBox(null, options, (response, checkboxChecked) =>
    {
        const shouldClear: boolean = response == 0;
        if (shouldClear && checkboxChecked)
        {
            sessionOptions.showClearDataDialog = false;
        }

        event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.ClearResult, {clear: shouldClear, remember: checkboxChecked}));
    });
}

function requestExportFilters(event: any, content: string)
{
    fileManager.getFiltersSaveLocation("filters", (path: string) =>
    {
        fileManager.saveFiltersToFile(path, content);
    });
}

function requestImportFilters(event: any)
{
    fileManager.openFiltersFile((path: string, content: string) =>
    {
        event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.ImportFiltersResult, content));
    }, () =>
    {
        event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.LongOperationOngoing, "Importing Filters"));
    });
}

function downloadResource(resource: Messaging.IDownloadResource)
{
    fileManager.downloadResource(resource.name, resource.content, resource.type);
}

export function initMessageHandling()
{
    ipcMain.on('asynchronous-message', (event: any, arg: Messaging.Message) =>
    {
        switch(arg.type)
        {
          case Messaging.MessageType.RequestSavePath:
            requestSavePath(event, arg.data as Messaging.IRequestSavePathData)
            break;

          case Messaging.MessageType.SaveToFile:
            saveToFile(event, arg.data as Messaging.ISaveFileData);
            break;

          case Messaging.MessageType.Load:
            load(event, arg.data as string);
            break;

          case Messaging.MessageType.Open:
            open(event);
            break;

          case Messaging.MessageType.Clear:
            clear(event);
            break;

          case Messaging.MessageType.SaveSettings:
            fileManager.updateSettings(arg.data as ISettings);
            break;

          case Messaging.MessageType.OpenInExplorer:
            shell.showItemInFolder(path.resolve(arg.data as string));
            break;
            
          case Messaging.MessageType.RequestExportFilters:
            requestExportFilters(event, arg.data as string);
            break;

          case Messaging.MessageType.RequestImportFilters:
            requestImportFilters(event);
            break;

          case Messaging.MessageType.DownloadResource:
            downloadResource(arg.data as Messaging.IDownloadResource);
            break;

        case Messaging.MessageType.CloseWindow:
        {
            const request = arg.data as Messaging.ICloseWindowRequest;
            UserWindowUtils.closeWindowById(request.id);
            break;
        }

        case Messaging.MessageType.CloseAllWindows:
        {
            UserWindowUtils.closeAllWindows();
            break;
        }

        case Messaging.MessageType.UpdateWindow:
        {
            const request = arg.data as Messaging.IUpdateWindowsContent;
            const window = BrowserWindow.fromId(request.id);
            if (window)
            {
                window.webContents.send('display-content', request);
            }
            break;
        }

        case Messaging.MessageType.OpenWindowRequest:
            {
                const request = arg.data as Messaging.IOpenWindowRequest;

                const window = UserWindowUtils.createWindow();
                const id = window.id;
                window.webContents.once('did-finish-load', () =>
                {
                    const result : Messaging.IOpenWindowResult = {
                        id: id,
                        requestId: request.requestId
                    }
                    event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.OpenWindowResult, result));
                });
            }
            break;

        }
    });
}

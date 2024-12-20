import { ipcMain, dialog } from "electron";
import * as path from "path";
import { ISettings } from "../files/Settings";
import { LogChannel, LogLevel, ILogAction } from "../frontend/ConsoleController";
import * as Messaging from "../messaging/MessageDefinitions";
import FileManager from "../files/FileManager";
import { createLogMessage } from "../mainThread/logging";
import { sessionOptions } from "../main";

const shell = require('electron').shell;

export function initMessageHandling(fileManager: FileManager)
{
    ipcMain.on('asynchronous-message', (event: any, arg: Messaging.Message) => {

        const logToConsole = (level: LogLevel, channel: LogChannel, ...message: (string | ILogAction)[]) => {
          event.reply('asynchronous-reply', createLogMessage(level, channel, ...message));
        };
      
        switch(arg.type)
        {
          case Messaging.MessageType.RequestSavePath:
          {
            const request = arg.data as Messaging.IRequestSavePathData;
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
            
            break;
          }
          case Messaging.MessageType.SaveToFile:
          {
            const fileSaveData = arg.data as Messaging.ISaveFileData;
            fileManager.saveRecordingToFile(fileSaveData.path, fileSaveData.content)
            break;
          }
          case Messaging.MessageType.Load:
          {
            const filePath = arg.data as string;
            try {
              if (fileManager.doesFileExist(filePath))
              {
                fileManager.loadRecordingFile(filePath, (pathName: string, content: string) => {
                  event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.FileOpened, pathName));
                  event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.OpenResult, content));
                });
              }
              else
              {
                const options = {
                  type: 'question',
                  buttons: ['Keep file', 'Remove from recent'],
                  title: 'File does not exist',
                  message: 'Looks like the file has been removed. Do you want to remove it from the recent file list?',
                };
              dialog.showMessageBox(null, options, (response) => {
                const souldRemove: boolean = response == 1;
                if (souldRemove) {
                  fileManager.removePathFromHistory(filePath);
                }
              });
              event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.OpenResult, null));
              }
            }
            catch(err) {
                const options = {
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
            break;
          }
          case Messaging.MessageType.Open:
          {
            fileManager.openRecordingsFile((pathName: string, content: string) => {
              event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.FileOpened, pathName));
              event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.OpenResult, content));
            }, () => {
              event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.LongOperationOngoing, "Opening File"));
            });
            break;
          }
          case Messaging.MessageType.Clear:
          {
            if (!sessionOptions.showClearDataDialog) {
              event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.ClearResult, {clear: true, remember: true}));
              break;
            }
      
            const options = {
              type: 'warning',
              buttons: ['Remove data', 'Cancel'],
              defaultId: 2,
              title: 'Remove data',
              message: 'Are you sure you want to remove all existing data?',
              detail: 'This will remove all recorded data',
              checkboxLabel: "Don't ask again",
              checkboxChecked: false,
            };
          
            dialog.showMessageBox(null, options, (response, checkboxChecked) => {
              const shouldClear: boolean = response == 0;
      
              if (shouldClear && checkboxChecked) {
                sessionOptions.showClearDataDialog = false;
              }
      
              event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.ClearResult, {clear: shouldClear, remember: checkboxChecked}));
            });
            break;
          }
          case Messaging.MessageType.SaveSettings:
          {
            fileManager.updateSettings(arg.data as ISettings);
            break;
          }
          case Messaging.MessageType.OpenInExplorer:
          {
            shell.showItemInFolder(path.resolve(arg.data as string));
            break;
          }
          case Messaging.MessageType.RequestExportFilters:
          {
            fileManager.getFiltersSaveLocation("filters", (path: string) => {
              fileManager.saveFiltersToFile(path, arg.data as string);
            });
            break;
          }
          case Messaging.MessageType.RequestImportFilters:
          {
            fileManager.openFiltersFile((path: string, content: string) => {
              event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.ImportFiltersResult, content));
            }, () => {
              event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.LongOperationOngoing, "Importing Filters"));
            });
            break;
          }
          case Messaging.MessageType.DownloadResource:
          {
              const message = arg.data as Messaging.IDownloadResource;
              fileManager.downloadResource(message.name, message.content, message.type);
              break;
          }
        }
      })
}

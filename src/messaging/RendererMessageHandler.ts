import * as path from "path";
import { ipcRenderer } from "electron";
import { ISettings } from "../files/Settings";
import { LogChannel, LogLevel } from "../frontend/ConsoleController";
import { Console } from "../frontend/ConsoleController";
import * as Messaging from "../messaging/MessageDefinitions";
import Renderer from "../renderer";

const { shell } = require('electron');

export function initMessageHandling(renderer: Renderer)
{
    ipcRenderer.on('asynchronous-reply', (event: any, arg: Messaging.Message) => {
        console.log(arg);
        switch(arg.type)
        {
            case Messaging.MessageType.OpenResult:
            {
                const result = arg.data as string;
                if (result)
                {
                    renderer.loadCompressedData(result);
                }
                else
                {
                    renderer.closeModal();
                }
                break;
            }
            case Messaging.MessageType.ClearResult:
            {
                const result = arg.data as Messaging.IClearResultData;
                if (result.clear)
                {
                    renderer.clear();
                }
                break;
            }
            case Messaging.MessageType.RequestSave:
            {
                renderer.onSaveFile();
                break;
            }
            case Messaging.MessageType.SavePathResult:
            {
                const resultPath = arg.data as Messaging.IResultSavePathData;
                Console.log(LogLevel.Information, LogChannel.Files, `Saving file file `, {
                    text: resultPath.path,
                    tooltip: "Open file in explorer",
                    callback: () => { shell.showItemInFolder(path.resolve(resultPath.path)); }
                });
                renderer.saveToPath(resultPath.path, resultPath.saveOnlySelection);
                break;
            }
            case Messaging.MessageType.UpdateRecentFiles:
            {
                const recentFiles = (arg.data as string).split(",");
                renderer.updateRecentFiles(recentFiles);
                break;
            }
            case Messaging.MessageType.LogToConsole:
            {
                const result = arg.data as Messaging.ILogData;
                Console.log(result.level, result.channel, ...result.message);
                break;
            }
            case Messaging.MessageType.FileOpened:
            {
                const pathName = arg.data as string;
                Console.log(LogLevel.Information, LogChannel.Files, `Loading file `, {
                    text: pathName,
                    tooltip: "Open file in explorer",
                    callback: () => { shell.showItemInFolder(path.resolve(pathName)); }
                });
                
                let title = path.basename(pathName) + " - Frame by Frame";
                document.title = title;
                document.getElementById("window-title-text").innerText = title;

                renderer.removeWelcomeMessage();
                break;
            }
            case Messaging.MessageType.SettingsChanged:
            {
                renderer.updateSettings(arg.data as ISettings);
                break;
            }
            case Messaging.MessageType.LongOperationOngoing:
            {
                renderer.openModal(arg.data as string);
                break;
            }
            case Messaging.MessageType.ImportFiltersResult:
            {
                const result = arg.data as string;
                if (result)
                {
                    renderer.loadFilters(result);
                }
                else
                {
                    renderer.closeModal();
                }
                break;
            }
            case Messaging.MessageType.ModFileOpened:
            {
                const result = arg.data as string;
                if (result)
                {
                    renderer.loadMod(result);
                }
                break;
            }
        }
    });
}
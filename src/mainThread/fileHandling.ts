import { app } from "electron";
import { ISettings } from "../files/Settings";
import * as Messaging from "../messaging/MessageDefinitions";
import { fileManager, mainWindow } from "../main";

// File callbacks
export function onFileHistoryChanged(paths: string[])
{
  mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.UpdateRecentFiles, paths.toString()));
}

export function onSettingsChanged(settings: ISettings)
{
  mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.SettingsChanged, settings));
}

export function onOpenFileClicked()
{
  fileManager.openRecordingsFile((pathName: string, content: string) => {
    mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.FileOpened, pathName));
    mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.OpenResult, content));
  }, (pathName: string) => {
    mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.LongOperationOngoing, "Opening File"));
  });
}

export function onExportFileClicked()
{
  mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.RequestSave, ""));
}

export function onOpenRecentFileClicked(pathName : string)
{
  mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.LongOperationOngoing, "Opening File"));
  fileManager.loadRecordingFile(pathName, (pathName: string, content: string) => {
    mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.FileOpened, pathName));
    mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.OpenResult, content));
  });
}

export function loadMods()
{
  const modFile = app.getPath('userData') + "/mods/mod.js";
  if (fileManager.doesFileExist(modFile))
  {
    fileManager.loadFile(modFile, (pathName: string, content: string) => {
      mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.ModFileOpened, content));
    });
  }
}
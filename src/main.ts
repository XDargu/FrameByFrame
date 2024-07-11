import { app, BrowserWindow, Menu, ipcMain, dialog, ipcRenderer } from "electron";
import * as path from "path";
import * as url from "url";
import * as fs from 'fs';

import MenuBuilder from "./components/Menu";
import FileManager from './files/FileManager';
import { ISettings } from "./files/Settings";
import { LogChannel, LogLevel, ILogAction } from "./frontend/ConsoleController";
import * as Messaging from "./messaging/MessageDefinitions";

import { FileRecordingHandler, ILoadRecordingResult } from "./io/recordingOperations";

import * as StreamZip from 'node-stream-zip';
import * as RECDATA from './recording/RecordingData';
import * as FileRec from "./recording/FileRecording";
import * as RECORDING from "./recording/RecordingDefinitions";


let mainWindow: Electron.BrowserWindow;

const shell = require('electron').shell;

// File Manager
let fileManager: FileManager;
let menuBuilder: MenuBuilder;

let recordingHandler: FileRecordingHandler;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 768,
    width: 1280,
    minWidth: 650,
    minHeight: 550, 
    backgroundColor: '#FFF',
    icon: __dirname + "../Icon.ico",
    fullscreen: false,
    frame: false,
    webPreferences: {
        nodeIntegration: true,
        nodeIntegrationInWorker: true
    }
  });

  //mainWindow.maximize();

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, "../index.html"),
      protocol: "file:",
      slashes: true,
  }));

  // Open the DevTools.
  if (!app.isPackaged)
  {
    mainWindow.webContents.openDevTools({mode: 'detach'});
  }

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  menuBuilder = new MenuBuilder(onOpenFileClicked, onExportFileClicked, onOpenRecentFileClicked);
  Menu.setApplicationMenu(menuBuilder.buildMenu(mainWindow));

  recordingHandler = new FileRecordingHandler(mainWindow);

  fileManager = new FileManager(recordingHandler);
  fileManager.initialize(onFileHistoryChanged, onSettingsChanged);

  mainWindow.webContents.once('dom-ready', onRendererReady);

  // Open external links
  mainWindow.webContents.on('will-navigate', function(event, url){
    logToConsole(LogLevel.Verbose, LogChannel.Default, "Opening: " + url);
    if (url.startsWith('https:')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

}

function onRendererReady()
{
  // We need to send the config here because the first time they load the renderer is not ready yet
  onFileHistoryChanged(fileManager.pathHistory.paths);
  onSettingsChanged(fileManager.settings);

  // Arguments
  if (app.isPackaged)
  {
    process.argv.unshift(null);
  }

  // parameters is now an array containing any files/folders that your OS will pass to your application
  const parameters = process.argv.slice(2);
  if (parameters.length > 0)
  {
    onOpenRecentFileClicked(parameters[0]);
  }

  loadMods();
}

// File callbacks
function onFileHistoryChanged(paths: string[])
{
  menuBuilder.updateRecentMenu(paths);
  Menu.setApplicationMenu(menuBuilder.buildMenu(mainWindow));
  mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.UpdateRecentFiles, paths.toString()));
}

function onSettingsChanged(settings: ISettings)
{
  mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.SettingsChanged, settings));
}

async function uncompressNaiveRecording(data: RECDATA.INaiveRecordedData) {

    const globalData: FileRec.GlobalData = {
        layers: data.layers,
        scenes: data.scenes,
        clientIds: data.clientIds as unknown as FileRec.IClientData,
        resources: data.resources,
        storageVersion: data.storageVersion,
        totalFrames: data.frameData.length,
    }

    logToConsole(LogLevel.Information, LogChannel.Default, `Exporting global data`);

    await recordingHandler.writeGlobalData(globalData);

    const totalFrames = data.frameData.length;
    const totalChunks = Math.ceil(totalFrames / FileRec.FileRecording.frameCutOff);

    logToConsole(LogLevel.Information, LogChannel.Default, `Chunks: ${totalChunks}`);

    for (let i=0; i<totalChunks; ++i)
    {
        const offset = FileRec.FileRecording.frameCutOff * i;
        const frameChunk = data.frameData.slice(offset, offset + FileRec.FileRecording.frameCutOff);

        logToConsole(LogLevel.Information, LogChannel.Default, `Exporting chunk ${i} with offset ${offset}`);

        await recordingHandler.writeFrameData(frameChunk, offset);
    }
}

async function saveRecordingFile(filePath: string) {
    
}

async function loadRecordingFile(filePath: string)
{
    try {
        fileManager.addPathToHistory(filePath);
        const isZip = await recordingHandler.isZipFile(filePath);
        if (isZip)
        {
            mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.LongOperationOngoing, "Opening File"));

            // Unzip global data to disk and send path
            const recording = await recordingHandler.loadEntireRecording(filePath);
            
            const openFileResult : Messaging.IOpenFileResult = {
                isZip: isZip,
                data: recording,
                path: filePath
            }

            mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.OpenResult, openFileResult));
        }
        else
        {
            mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.LongOperationOngoing, "Opening File"));

            // Send entire data
            const data = await fs.promises.readFile(filePath, 'utf8');

            const openFileResult : Messaging.IOpenFileResult = {
                isZip: isZip,
                data: data,
                path: filePath
            }

            mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.OpenResult, openFileResult));
        }
    }
    catch(err) {
        const options = {
            type: 'error',
            buttons: ['OK'],
            title: 'Error reading file',
            message: 'An error ocurred reading the file:',
            detail: err.message,
            checkboxChecked: false,
        };
        dialog.showMessageBox(null, options);

        mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.OpenResult, null));
    }
}

async function onOpenFileClicked()
{
    const filePath = await fileManager.openRecordingDialog();
    loadRecordingFile(filePath);
}

function onExportFileClicked()
{
  mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.RequestSave, ""));
}

function onOpenRecentFileClicked(filePath: string) 
{
    loadRecordingFile(filePath);
}

function loadMods()
{
  const modFile = app.getPath('userData') + "/mods/mod.js";
  if (fileManager.doesFileExist(modFile))
  {
    fileManager.loadFile(modFile, (pathName: string, content: string) => {
      mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.ModFileOpened, content));
    });
  }
}

// Message helpers
function createLogMessage(level: LogLevel, channel: LogChannel, ...message: (string | ILogAction)[]) : Messaging.Message
{
  return new Messaging.Message(Messaging.MessageType.LogToConsole, {
    message: message,
    level: level,
    channel: channel
 });
}

function logToConsole(level: LogLevel, channel: LogChannel, ...message: (string | ILogAction)[])
{
  mainWindow.webContents.send('asynchronous-reply', createLogMessage(level, channel, ...message));
};


// Increase available memory
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=1024');

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it"s common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
class SessionOptions {
  public showClearDataDialog: boolean = true;
}

let sessionOptions: SessionOptions = new SessionOptions();

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
        return;
        const fileSaveData = arg.data as Messaging.ISaveFileData;
        fileManager.saveRecordingToFile(fileSaveData.path, fileSaveData.content)
        break;
    }
    case Messaging.MessageType.Load:
    {
        const filePath = arg.data as string;
        if (fileManager.doesFileExist(filePath))
        {
            loadRecordingFile(filePath);
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
     
      break;
    }
    case Messaging.MessageType.Open:
    {
        onOpenFileClicked();
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
    case Messaging.MessageType.RequestConvertNaiveRecording:
    {
        const request = arg.data as Messaging.IRequestConvertRecording;

        const naiveRecording = JSON.parse(request.data);
        uncompressNaiveRecording(naiveRecording);
        event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.RequestConversionResult, null));
    }
  }
})


async function TestCompressUncompress(pathName: string)
{
    // Create cache
    const uncompressedTest = path.join(app.getPath('userData'), "./test/cache/fbf0");

    // TODO: Delete directory recursively

    if (!fs.existsSync(uncompressedTest))
    {
        fs.mkdirSync(uncompressedTest, { recursive: true });
    }

    // Uncompress
    const zip = new StreamZip.async({ file: pathName });

    const entriesCount = await zip.entriesCount;
    logToConsole(LogLevel.Information, LogChannel.Default, `Entries read: ${entriesCount}`);

    const entries = await zip.entries();
    const values = Object.values(entries);

    let total = 0;

    for (const entry of values) 
    {
        const desc = entry.isDirectory ? 'directory' : `${entry.size} bytes`;
        if (entry.isFile)
            total++;
        logToConsole(LogLevel.Information, LogChannel.Default, `Entry ${entry.name}: ${desc}`);
    }


    // We are only going to extract the global data
    //logToConsole(LogLevel.Information, LogChannel.Default, `Extracting globaldata to ${path.join(uncompressedTest, 'globaldata.ffd')}`);
    //await zip.extract('root/globaldata.ffd', path.join(uncompressedTest, 'globaldata.ffd'));


    // Extract everything
    logToConsole(LogLevel.Information, LogChannel.Default, `Extracting everything`);

    let filesProcessed = 0;

    zip.on('extract', (entry, file) => {

        filesProcessed++;
        const percentage = filesProcessed / total * 100;

        logToConsole(LogLevel.Information, LogChannel.Default, `Extracted ${entry.name} to ${file} (${percentage.toFixed(0)}%)`);
    });

    await zip.extract(null, uncompressedTest);

    // Do not forget to close the file once you're done
    await zip.close();
    logToConsole(LogLevel.Information, LogChannel.Default, `Extraction complete`);

    

    logToConsole(LogLevel.Information, LogChannel.Default, `Compressing extracted files complete`);

    const archiver = require('archiver');

    logToConsole(LogLevel.Information, LogChannel.Default, `Compressing to: ${path.join(uncompressedTest, './example.fbf')}`);

    const name = path.basename(pathName);

    const output = fs.createWriteStream(path.join(uncompressedTest, `./${name}`));
    const archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });

    // listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    output.on('close', function() {
        logToConsole(LogLevel.Information, LogChannel.Default, archive.pointer() + ' total bytes');
        logToConsole(LogLevel.Information, LogChannel.Default, 'archiver has been finalized and the output file descriptor has closed.');
    });

    // pipe archive data to the file
    archive.pipe(output);

    logToConsole(LogLevel.Information, LogChannel.Default, `Adding folder: ${path.join(uncompressedTest, './')}`);

    // append files from a sub-directory, putting its contents at the root of archive
    archive.directory(path.join(uncompressedTest, './root'), false);

    // finalize the archive (ie we are done appending files but streams have to finish yet)
    // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
    archive.finalize();

}
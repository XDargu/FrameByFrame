import { app, BrowserWindow } from "electron";
import * as path from "path";
import * as url from "url";
import { LogChannel, LogLevel } from "./frontend/ConsoleController";
import FileManager from "./files/FileManager";
import { loadMods, onFileHistoryChanged, onOpenRecentFileClicked, onSettingsChanged } from "./mainThread/fileHandling";
import { logToConsole } from "./mainThread/logging";
import { SessionOptions } from "./mainThread/sessionOptions";
import { initMessageHandling } from "./messaging/MainMessageHandler";

export let mainWindow: Electron.BrowserWindow;
export let fileManager: FileManager;
export let sessionOptions: SessionOptions;
  
const shell = require('electron').shell;

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

    app.quit();
  });

  fileManager = new FileManager();
  sessionOptions = new SessionOptions();

  fileManager.initialize(onFileHistoryChanged, onSettingsChanged);

  mainWindow.webContents.once('dom-ready', onRendererReady);

  // Open external links
  mainWindow.webContents.on('will-navigate', function(event, url){
    logToConsole(LogLevel.Verbose, LogChannel.Default, "Opening: " + url);
    if (url.startsWith('https:') || url.startsWith('www.') || url.startsWith('http:')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  initMessageHandling();
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

// Increase available memory
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=8192');

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
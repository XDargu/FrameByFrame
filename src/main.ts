import { app, BrowserWindow, Menu, ipcMain } from "electron";
import * as path from "path";
import * as url from "url";
import menu from "./components/Menu";
import FileManager from './files/FileManager';
import * as Messaging from "./messaging/MessageDefinitions";

let mainWindow: Electron.BrowserWindow;

// File Manager
let fileManager: FileManager;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 768,
    width: 1024,
    /*frame: false,*/
    webPreferences: {
        nodeIntegration: true,
        nodeIntegrationInWorker: true
    }
  });

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, "../index.html"),
      protocol: "file:",
      slashes: true,
  }));

  // Open the DevTools.
  mainWindow.webContents.openDevTools({mode: 'detach'});

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  Menu.setApplicationMenu(menu(mainWindow));

  fileManager = new FileManager();
}

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

ipcMain.on('asynchronous-message', (event: any, arg: Messaging.Message) => {
  switch(arg.type)
  {
    case Messaging.MessageType.Save:
    {
      fileManager.saveFile(arg.data);
      break;
    }
    case Messaging.MessageType.Open:
    {
      fileManager.openFile((path: string, content: string) => {
        console.log('Returning! ');
        console.log(event);
        event.reply('asynchronous-reply', new Messaging.Message(Messaging.MessageType.OpenResult, content));
      });
      break;
    }
  }
})
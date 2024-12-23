import { app, BrowserWindow, ipcRenderer } from "electron";
import * as Messaging from "../messaging/MessageDefinitions";
import * as path from "path";
import { mainWindow } from "../main";

// We need to store them, to prevent having no references to the window
let userWindows: BrowserWindow[] = [];

export function closeWindowById(id: number)
{
    BrowserWindow.fromId(id).close();
    userWindows = userWindows.filter(function(window) { return window.id !== id });
}

export function closeAllWindows()
{
    for (let window of userWindows)
    {
        window.close();
    }
    userWindows = [];
}

export function createWindow() : BrowserWindow
{
    // Create the new window
    let newWindow = new BrowserWindow({
        width: 400,
        height: 300,
        icon: __dirname + "../Icon.ico",
        fullscreen: false,
        frame: false,
        webPreferences:
        {
            nodeIntegration: true,
            nodeIntegrationInWorker: true
        }
    });

    userWindows.push(newWindow);

    // Handle window close
    newWindow.on('close', () =>
    {
        const message : Messaging.IWindowsClosed = {
            id: newWindow.id
        }
        
        mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.WindowsClosed, message));

        userWindows = userWindows.filter(function(window) { return window.id !== newWindow.id });
        newWindow = null;
    });

    newWindow.loadFile(path.join(__dirname, '../../userWindow.html'));

    if (!app.isPackaged)
    {
        newWindow.webContents.openDevTools({mode: 'detach'});
    }

    return newWindow;
}
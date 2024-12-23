import { BrowserWindow } from "electron";
import * as Messaging from "../messaging/MessageDefinitions";
import * as path from "path";

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

    newWindow.loadFile(path.join(__dirname, '../../userWindow.html'));

    newWindow.webContents.openDevTools({mode: 'detach'});

    // Handle window close
    newWindow.on('closed', () => {
        newWindow = null;
    });

    return newWindow;
}
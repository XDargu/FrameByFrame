import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as Messaging from "../messaging/MessageDefinitions";
import { exec } from 'child_process';
import { app } from 'electron';
import { fileManager, mainWindow } from "../main";

export async function installUpdate(updateResult: Messaging.IUpdateInstallRequest)
{
    try
    {
        mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.LongOperationOngoing, "Downloading Frame by Frame " + updateResult.version));
        const filePath = path.join(os.tmpdir(), path.basename(updateResult.downloadUrl));
        await fs.promises.writeFile(filePath, updateResult.buffer);

        mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.LongOperationOngoing, "Installing Frame by Frame " + updateResult.version));
        await fileManager.unblockFileWindows(filePath)
        await runUpdateInstaller(filePath);
        mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.LongOperationOver, ""));

    }
    catch(error)
    {
        mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.UpdateInstallFailed, error.message));
    }
}

async function runUpdateInstaller(filePath: string) : Promise<void>
{
    return new Promise((resolve, reject) =>
    {
        console.log('Installing update...');
        exec(`start ${filePath}`, (error) => {
            if (error)
            {
                console.error('Error starting installer:', error.message);
                reject(error);
            }
            else
            {
                console.log('Installer started successfully. Quitting app...');
                resolve();
                app.quit();
            }
        });
    });
}
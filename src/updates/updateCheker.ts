import * as https from 'https';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as Utils from "../utils/utils";
import * as Messaging from "../messaging/MessageDefinitions";
import { LIB_VERSION } from "../version";
import { exec } from 'child_process';
import { app } from 'electron';
import { fileManager, mainWindow } from "../main";
import { GitHubRelease } from './gitHub';
import { logToConsole } from '../mainThread/logging';
import { LogChannel, LogLevel } from '../frontend/ConsoleController';

export interface ICheckUpdateResult
{
    available: boolean;
    error?: string;
    version: string;
    release?: GitHubRelease,
    downloadUrl?: string,
}

const currentVersion = LIB_VERSION;

const repoOwner = 'XDargu';
const repoName = 'FrameByFrame';

// Utility to make HTTPS GET requests with a promise
function httpsGet(url: string)
{
    return new Promise((resolve, reject) =>
    {
        https.get(url, { headers: { 'User-Agent': 'FrameByFrame' } }, (res) =>
        {
            if (res.statusCode !== 200) {
                reject(new Error(`Request Failed. Status Code: ${res.statusCode}`));
                return;
            }

            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => resolve(data));
        })
        .on('error', reject);
    });
}

export async function checkForUpdates()
{
    const updateResult = await findLatestUpdate();
    const updateData : Messaging.IUpdateResult = updateResult;
    if (updateResult.error != undefined)
    {
        logToConsole(LogLevel.Error, LogChannel.Updates, "Error checking for updates: " + updateResult.error);
    }

    mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.UpdateResult, updateData));
}

async function findLatestUpdate() : Promise<ICheckUpdateResult>
{
    try
    {
        const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;
        const releaseData = await httpsGet(apiUrl) as string;
        const release = JSON.parse(releaseData) as GitHubRelease;
        const latestVersion = release.tag_name.replace(/^v/, ''); // Remove 'v' if present

        if (Utils.compareVersions(latestVersion, currentVersion))
        {
            for (let asset of release.assets)
            {
                if (!asset.name.includes("Portable")) // Ignore portable version
                {
                    return {
                        available: true,
                        version: latestVersion,
                        release: release,
                        downloadUrl: asset.browser_download_url,
                    };
                }
            }
        }

        return {
            available: false,
            version: latestVersion,
            release: release
        };
    }
    catch(error)
    {
        return {
            available: false,
            version: 'Unkown',
            error: error.message
        }
    }
}

export async function installUpdate(updateResult: ICheckUpdateResult)
{
    try 
    {
        if (updateResult.available && updateResult.downloadUrl)
        {
            mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.LongOperationOngoing, "Downloading Frame by Frame " + updateResult.version));
            const filePath = path.join(os.tmpdir(), path.basename(updateResult.downloadUrl));
            await downloadUpdate(updateResult.downloadUrl, filePath);

            mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.LongOperationOngoing, "Installing Frame by Frame " + updateResult.version));
            await fileManager.unblockFileWindows(filePath)
            await runUpdateInstaller(filePath);
        }
    }
    catch(error)
    {
        mainWindow.webContents.send('asynchronous-reply', new Messaging.Message(Messaging.MessageType.UpdateInstallFailed, error.message));
    }
}

async function downloadUpdate(downloadUrl: string, filePath: string) : Promise<void>
{
    return new Promise((resolve, reject) => {
        const makeRequest = (url: string) =>
        {
            https.get(url, (res) =>
            {
                if (res.statusCode === 302 && res.headers.location)
                {
                    // Follow redirect
                    makeRequest(res.headers.location);
                }
                else if (res.statusCode !== 200)
                {
                    reject(new Error(`Download failed. Status Code: ${res.statusCode}`));
                }
                else
                {
                    // Pipe the response to a file
                    const file = fs.createWriteStream(filePath);
                    res.pipe(file);

                    file.on('finish', () => {
                        file.close();
                        console.log('Update downloaded to:', filePath);
                        resolve();
                    });

                    file.on('error', (err) => {
                        fs.unlink(filePath, () => reject(err)); // Delete incomplete file on error
                    });
                }
            })
            .on('error', (err) => {
                reject(err);
            });
        };

        makeRequest(downloadUrl); // Start the request
    });
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
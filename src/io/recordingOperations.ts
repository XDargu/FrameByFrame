import { app, BrowserWindow } from "electron";
import * as FileRec from "../recording/FileRecording";
import * as RECORDING from "../recording/RecordingDefinitions";
import { LogChannel, LogLevel, ILogAction } from "../frontend/ConsoleController";
import * as Messaging from "../messaging/MessageDefinitions";

import * as fs from 'fs';
import * as path from 'path';
import * as StreamZip from 'node-stream-zip';

export interface ILoadRecordingResult
{
    type: RECORDING.RecordingFileType,
    content: string
}

const archiver = require('archiver');

export class FileRecordingHandler
{
    mainWindow: BrowserWindow;

    constructor(mainWindow: BrowserWindow)
    {
        this.mainWindow = mainWindow;
    }

    private createLogMessage(level: LogLevel, channel: LogChannel, ...message: (string | ILogAction)[]) : Messaging.Message
    {
        return new Messaging.Message(Messaging.MessageType.LogToConsole, {
            message: message,
            level: level,
            channel: channel
        });
    }

    private logToConsole(level: LogLevel, channel: LogChannel, ...message: (string | ILogAction)[])
    {
        this.mainWindow.webContents.send('asynchronous-reply', this.createLogMessage(level, channel, ...message));
    };
    

    private async uncompressedFileRecording(pathName: string, targetPath: string)
    {
        // Create cache

        // TODO: Delete directory recursively

        if (!fs.existsSync(targetPath))
        {
            fs.mkdirSync(targetPath, { recursive: true });
        }

        // Uncompress
        const zip = new StreamZip.async({ file: pathName });

        const entriesCount = await zip.entriesCount;
        this.logToConsole(LogLevel.Information, LogChannel.Default, `Entries read: ${entriesCount}`);

        const entries = await zip.entries();
        const values = Object.values(entries);

        let total = 0;

        for (const entry of values) 
        {
            const desc = entry.isDirectory ? 'directory' : `${entry.size} bytes`;
            if (entry.isFile)
                total++;
            this.logToConsole(LogLevel.Information, LogChannel.Default, `Entry ${entry.name}: ${desc}`);
        }

        // Extract everything for now. Later, we can do on-demand extraction
        this.logToConsole(LogLevel.Information, LogChannel.Default, `Extracting everything`);

        let filesProcessed = 0;

        zip.on('extract', (entry, file) => {

            filesProcessed++;
            const percentage = filesProcessed / total * 100;

            this.logToConsole(LogLevel.Information, LogChannel.Default, `Extracted ${entry.name} to ${file} (${percentage.toFixed(0)}%)`);
        });

        await zip.extract(null, targetPath);

        // Do not forget to close the file once you're done
        await zip.close();
        this.logToConsole(LogLevel.Information, LogChannel.Default, `Extraction complete`);
    }

    static getRootPath()
    {
        // We should try to find out how to count the number of open instances of FbF to get the path!
        // Otherwise, we would only be able to open a single file
        return path.join(app.getPath('userData'), "./test/cache/fbf0");
    }

    async loadRecording(pathName: string)  : Promise<ILoadRecordingResult>
    {
        const isZip = await this.isZipFile(pathName);
        if (isZip)
        {
            return {
                type: RECORDING.RecordingFileType.FileRecording,
                content: ''
            }
        }
        else
        {
            const data = await fs.promises.readFile(pathName, 'utf8');
            
            return {
                type: RECORDING.RecordingFileType.FileRecording,
                content: data
            }
        }
    }

    async isZipFile(pathName: string) : Promise<boolean>
    {
        // Test if it's the new format, by trying to read the zip file entries
        try {
            const zip = new StreamZip.async({ file: pathName });
            const entriesCount = await zip.entriesCount;
            await zip.close();
        }
        catch(err) {
            return false;
        }

        return true;
    }

    async loadEntireRecording(pathName: string)
    {
        const targetPath = FileRecordingHandler.getRootPath();
        await this.uncompressedFileRecording(pathName, targetPath);

        // Create file recording
        let fileRec = new FileRec.FileRecording(targetPath);

        // Load global data
        const globalData = fs.readFileSync(fileRec.paths.globaldata);

        this.logToConsole(LogLevel.Information, LogChannel.Default, `Global data raw ${globalData}`);

        fileRec.globalData = JSON.parse(globalData.toString());

        // Load frame data. Do it on demand later
        this.logToConsole(LogLevel.Information, LogChannel.Default, `Global data ${fileRec.globalData.clientIds}: ${fileRec.globalData.layers}`);

        return fileRec;
    }

    async compressRecording(source: string, destination: string)
    {
        return new Promise<void>((resolve, reject) => {
            this.logToConsole(LogLevel.Information, LogChannel.Default, `Compressing to: ${destination}`);

            const output = fs.createWriteStream(destination);
            const archive = archiver('zip', {
                zlib: { level: 9 } // Sets the compression level.
            });

            // listen for all archive data to be written
            // 'close' event is fired only when a file descriptor is involved
            output.on('close', function() {
                this.logToConsole(LogLevel.Information, LogChannel.Default, archive.pointer() + ' total bytes');
                this.logToConsole(LogLevel.Information, LogChannel.Default, 'archiver has been finalized and the output file descriptor has closed.');

                resolve();
            });

            // good practice to catch this error explicitly
            archive.on('error', function(err: Error) {
                reject(err.message);
            });

            // pipe archive data to the file
            archive.pipe(output);

            this.logToConsole(LogLevel.Information, LogChannel.Default, `Adding folder: ${source}`);

            // append files from a directory, putting its contents at the root of archive
            archive.directory(source, false);

            // finalize the archive (ie we are done appending files but streams have to finish yet)
            // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
            archive.finalize();
        });
    }

    async writeGlobalData(globalData: FileRec.GlobalData)
    {
        const targetPath = FileRecordingHandler.getRootPath();

        const paths = FileRec.Ops.makePaths(targetPath);

        if (!fs.existsSync(targetPath))
            fs.mkdirSync(targetPath, { recursive: true });

        const data = JSON.stringify(globalData);
        await fs.promises.writeFile(paths.globaldata, data);
    }

    async writeFrameData(frames: RECORDING.IFrameData[], offset: number)
    {
        const targetPath = FileRecordingHandler.getRootPath();

        const paths = FileRec.Ops.makePaths(targetPath);
        const frameFilePath = path.join(paths.frames, `./${offset}.ffd`);
        const data = JSON.stringify(frames);

        this.logToConsole(LogLevel.Information, LogChannel.Default, `Target ${targetPath}. Frame path: ${paths.frames}. Final path: ${frameFilePath}`);
        this.logToConsole(LogLevel.Information, LogChannel.Default, `Exporting chunk with ${frames.length} frames to ${frameFilePath}`);

        if (!fs.existsSync(paths.frames))
            fs.mkdirSync(paths.frames, { recursive: true });

        await fs.promises.writeFile(frameFilePath, data);
    }
}
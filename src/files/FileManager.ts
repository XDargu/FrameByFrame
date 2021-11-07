import { app, remote, dialog } from "electron";
import * as fs from 'fs';
import * as path from 'path';

export interface IOpenFileCallback
{
    (path: string, content: string) : void;
}

export interface IHistoryChangedCallback
{
    (paths: string[]) : void;
}

interface IPathHistory
{
    paths : string[];
}

export default class FileManager
{
    historyDir : string;
    historyFile : string;
    pathHistory : IPathHistory;
    onHistoryChangedCallback : IHistoryChangedCallback;

    constructor()
    {
        const {app} = require('electron');

        this.historyDir = app.getPath('userData') + "/config/history";
        this.historyFile = "info.json";
        this.pathHistory = { paths: [] };
    }

    initialize(onHistoryChangedCallback : IHistoryChangedCallback)
    {
        this.onHistoryChangedCallback = onHistoryChangedCallback;
        this.loadHistory();
    }

    openFile(callback: IOpenFileCallback)
    {
        const options = {
            filters: [
                { name: 'Recordings', extensions: ['fbf'] },
            ]
        };

        dialog.showOpenDialog(null, options, (paths: string[]) => {
            if (paths === undefined || paths.length == 0){
                console.log("You didn't open a file");
                return;
            }

            this.loadFile(paths[0], callback);
        });
    }

    loadFile(path: string, callback: IOpenFileCallback)
    {
        fs.readFile(path, 'utf-8', (err, data) => {
            if(err){
                const options = {
                    type: 'error',
                    buttons: ['OK'],
                    title: 'Error reading file',
                    message: 'An error ocurred reading the file',
                    detail: err.message,
                    checkboxChecked: false,
                  };
                dialog.showMessageBox(null, options);
                return;
            }
    
            this.updateHistory(path);
            callback(path, data);
        });
    }

    saveFile(content: string)
    {
        const options = {
            defaultPath: app.getPath('documents') + '/recording.fbf',
            filters: [
                { name: 'Recordings', extensions: ['fbf'] },
            ]
        }

        dialog.showSaveDialog(null, options, (path: string) => {
            if (path === undefined){
                console.log("You didn't save the file");
                return;
            }

            fs.writeFile(path, content, (err) => {
                if(err){
                    console.log("An error ocurred creating the file "+ err.message)
                }

                this.updateHistory(path);
                console.log("The file has been succesfully saved");
            });
        });
    }

    loadHistory()
    {
        console.log('Loading history');
        if (!fs.existsSync(this.historyDir))
        {
            console.log('Creating history dir');
            fs.mkdirSync(this.historyDir, { recursive: true });
        }

        const historyPath = this.getHistoryPath();

        if (!fs.existsSync(historyPath))
        {
            console.log('Creating history file');
            fs.writeFile(historyPath, JSON.stringify(this.pathHistory), (err) => {
                if(err){
                    console.log("An error ocurred creating the history file "+ err.message)
                }
            });
        }
        else
        {
            console.log('Loading history file');
            fs.readFile(historyPath, 'utf-8', (err, data) => {
                if(err){
                    const options = {
                        type: 'error',
                        buttons: ['OK'],
                        title: 'Error loading recent files',
                        message: 'An error ocurred loading the list of recent files',
                        detail: err.message,
                        checkboxChecked: false,
                      };
                    dialog.showMessageBox(null, options);
                    return; 
                }

                this.pathHistory = JSON.parse(data);
                if (this.onHistoryChangedCallback)
                {
                    this.onHistoryChangedCallback(this.pathHistory.paths);
                }
            });
        }
    }

    updateHistory(path : string)
    {
        const historyPath = this.getHistoryPath();

        const index = this.pathHistory.paths.indexOf(path);
        if (index > -1)
        {
            this.pathHistory.paths.splice(index, 1);
        }
        
        this.pathHistory.paths.unshift(path);
        if (this.pathHistory.paths.length > 15)
        {
            this.pathHistory.paths.pop();
        }
        fs.writeFile(historyPath, JSON.stringify(this.pathHistory), (err) => {
            if(err){
                console.log("An error ocurred creating the history file "+ err.message)
            }

            if (this.onHistoryChangedCallback)
            {
                this.onHistoryChangedCallback(this.pathHistory.paths);
            }
        });
    }

    private getHistoryPath() : string {
        return `${this.historyDir}/${this.historyFile}`;
    }
}
import { app, remote, dialog } from "electron";
import * as fs from 'fs';
import { createDefaultSettings, ISettings } from "./Settings";

export interface IFileAcceptedCallback
{
    (path: string) : void
}

export interface IOpenFileCallback
{
    (path: string, content: string) : void;
}

export interface IHistoryChangedCallback
{
    (paths: string[]) : void;
}

export interface ISettingsChangedCallback
{
    (settings: ISettings) : void;
}

interface IPathHistory
{
    paths : string[];
}

interface ConfigFileError
{
    (error: NodeJS.ErrnoException) : void;
}
interface ConfigFileSuccess
{
    (data: IPathHistory | ISettings) : void;
}

interface LoadConfigFileParams
{
    dir: string;
    file: string;
    data: IPathHistory | ISettings;
    onError: ConfigFileError;
    onSuccess: ConfigFileSuccess;
}

interface UpdateConfigFileParams
{
    dir: string;
    file: string;
    data: IPathHistory | ISettings;
    onError: ConfigFileError;
    onSuccess: ConfigFileSuccess;
}

function loadConfigFile(params: LoadConfigFileParams)
{
    console.log('Loading history');
    if (!fs.existsSync(params.dir))
    {
        console.log('Creating config dir');
        fs.mkdirSync(params.dir, { recursive: true });
    }

    const path = params.dir + "/" + params.file;

    if (!fs.existsSync(path))
    {
        console.log('Creating config file');
        fs.writeFile(path, JSON.stringify(params.data), (err) => {
            if(err){
                console.log("An error ocurred creating the config file "+ err.message)
            }
        });
    }
    else
    {
        console.log('Loading config file');
        fs.readFile(path, 'utf-8', (err, fileData) => {
            if(err){
                params.onError(err);
                return; 
            }
            params.data = JSON.parse(fileData);
            params.onSuccess(params.data);
        });
    }
}

function updateConfigFile(params: UpdateConfigFileParams)
{
    const path = params.dir + "/" + params.file;
    
    fs.writeFile(path, JSON.stringify(params.data), (err) => {
        if(err){
            params.onError(err);
            return;
        }

        params.onSuccess(params.data);
    });
}

function displayError(err: NodeJS.ErrnoException, title: string, message: string)
{
    const options = {
        type: 'error',
        buttons: ['OK'],
        title: title,
        message: message,
        detail: err.message,
        checkboxChecked: false,
      };
    dialog.showMessageBox(null, options);
}

export default class FileManager
{
    historyDir : string;
    historyFile : string;

    settingsDir : string;
    settingsFile : string;

    pathHistory : IPathHistory;
    settings : ISettings;

    onHistoryChangedCallback : IHistoryChangedCallback;
    onSettingsChangedCallback: ISettingsChangedCallback;

    constructor()
    {
        const {app} = require('electron');

        this.historyDir = app.getPath('userData') + "/config/history";
        this.settingsDir = app.getPath('userData') + "/config/settings";
        this.historyFile = "info.json";
        this.settingsFile = "settings.json";
        this.pathHistory = { paths: [] };
        this.settings = createDefaultSettings();
    }

    initialize(onHistoryChangedCallback : IHistoryChangedCallback, onSettingsChangedCallback: ISettingsChangedCallback)
    {
        this.onHistoryChangedCallback = onHistoryChangedCallback;
        this.onSettingsChangedCallback = onSettingsChangedCallback;
        this.loadHistory();
        this.loadSettings();
    }

    doesFileExist(path: string)
    {
        return fs.existsSync(path);
    }

    async getSaveLocation(defaultName: string, extension: string, description: string, callback: ((path: string) => void))
    {
        const options = {
            defaultPath: `${app.getPath('documents')}/${defaultName}.${extension}`,
            filters: [
                { name: description, extensions: [extension] },
            ]
        }

        dialog.showSaveDialog(null, options, (path: string) => {
            if (path === undefined){
                console.log("You didn't save the file");
                return;
            }

            callback(path);
        });
    }

    async loadRecordingFile(path: string, callback: IOpenFileCallback)
    {
        const data = await fs.promises.readFile(path, 'utf8')
        this.addPathToHistory(path);
        callback(path, data);
    }

    async loadFile(path: string, callback: IOpenFileCallback)
    {
        const data = await fs.promises.readFile(path, 'utf8')
        callback(path, data);
    }

    async getRecordingSaveLocation(defaultName: string, callback: ((path: string) => void))
    {
        this.getSaveLocation(defaultName, "fbf", "Recordings", callback);
    }

    async getFiltersSaveLocation(defaultName: string, callback: ((path: string) => void))
    {
        this.getSaveLocation(defaultName, "fbff", "Filters", callback);
    }

    openRecordingsFile(callback: IOpenFileCallback, acceptedCallback: IFileAcceptedCallback)
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

            acceptedCallback(paths[0]);
            this.loadRecordingFile(paths[0], callback);
        });
    }

    openFiltersFile(callback: IOpenFileCallback, acceptedCallback: IFileAcceptedCallback)
    {
        const options = {
            filters: [
                { name: 'Filters', extensions: ['fbff'] },
            ]
        };

        dialog.showOpenDialog(null, options, (paths: string[]) => {
            if (paths === undefined || paths.length == 0){
                console.log("You didn't open a file");
                return;
            }

            acceptedCallback(paths[0]);
            this.loadFile(paths[0], callback);
        });
    }

    saveRecordingToFile(path: string, content: string)
    {
        fs.writeFile(path, content, (err) => {
            if(err){
                console.log("An error ocurred creating the file "+ err.message)
            }

            this.addPathToHistory(path);
            console.log("The file has been succesfully saved");
        });
    }

    saveFiltersToFile(path: string, content: string)
    {
        fs.writeFile(path, content, (err) => {
            if(err){
                console.log("An error ocurred creating the file "+ err.message)
            }

            console.log("The file has been succesfully saved");
        });
    }

    loadHistory()
    {
        loadConfigFile({
            dir: this.historyDir,
            file: this.historyFile,
            data: this.pathHistory,
            onError: (err) => {
                displayError(err, 'Error loading recent files', 'An error ocurred loading the list of recent files');
            },
            onSuccess: (data: IPathHistory) => {
                if (this.onHistoryChangedCallback)
                {
                    this.pathHistory = data;
                    this.onHistoryChangedCallback(this.pathHistory.paths);
                }
            }
        });
    }

    loadSettings()
    {
        loadConfigFile({
            dir: this.settingsDir,
            file: this.settingsFile,
            data: this.settings,
            onError: (err) => {
                displayError(err, 'Error loading settings', 'An error ocurred loading the list of settings');
            },
            onSuccess: (data: ISettings) => {
                if (this.onSettingsChangedCallback)
                {
                    this.settings = Object.assign({}, createDefaultSettings(), data);
                    this.onSettingsChangedCallback(this.settings);
                }
            }
        });
    }

    updateSettings(settings: ISettings)
    {
        this.settings = settings;
        updateConfigFile({
            dir: this.settingsDir,
            file: this.settingsFile,
            data: this.settings,
            onError: (err) => {
                displayError(err, 'Error saving settings', 'An error ocurred saving the list of settings');
            },
            onSuccess: () => {
            }
        });
    }

    addPathToHistory(path : string)
    {
        // Limit recent paths to 15
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

        updateConfigFile({
            dir: this.historyDir,
            file: this.historyFile,
            data: this.pathHistory,
            onError: (err) => {
                displayError(err, 'Error saving recent files', 'An error ocurred saving the list of recent files');
            },
            onSuccess: () => {
                if (this.onHistoryChangedCallback)
                {
                    this.onHistoryChangedCallback(this.pathHistory.paths);
                }
            }
        });
    }

    removePathFromHistory(path: string)
    {
        const index = this.pathHistory.paths.indexOf(path);
        if (index !== -1) {
            this.pathHistory.paths.splice(index, 1);

            updateConfigFile({
                dir: this.historyDir,
                file: this.historyFile,
                data: this.pathHistory,
                onError: (err) => {
                    displayError(err, 'Error saving recent files', 'An error ocurred saving the list of recent files');
                },
                onSuccess: () => {
                    if (this.onHistoryChangedCallback)
                    {
                        this.onHistoryChangedCallback(this.pathHistory.paths);
                    }
                }
            });
        }
    }
}
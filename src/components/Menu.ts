import { app, Menu } from "electron";

export interface IOnOpenFileCliked
{
    () : void;
}

export interface IOnOpenRecentFileCliked
{
    (path : string) : void;
}

export interface IOnExportFileCliked
{
    () : void;
}

export default class MenuBuilder
{ 
    onOpenFileCallback : IOnOpenFileCliked;
    onExportFileCallback : IOnExportFileCliked;
    onOpenRecentFileCallback : IOnOpenRecentFileCliked;

    recentSubmenu : Electron.MenuItemConstructorOptions[] = [];

    constructor(onOpenFileCallback : IOnOpenFileCliked, onExportFileCallback : IOnExportFileCliked, onOpenRecentFileCallback : IOnOpenRecentFileCliked)
    {
        this.onOpenFileCallback = onOpenFileCallback;
        this.onExportFileCallback = onExportFileCallback;
        this.onOpenRecentFileCallback = onOpenRecentFileCallback
    }

    updateRecentMenu(paths: string[])
    {
        this.recentSubmenu = [];
        for (let path of paths)
        {
            let callback : IOnOpenRecentFileCliked = this.onOpenRecentFileCallback;
            this.recentSubmenu.push({ label: path, click: function() { callback(path); } })
        }
    }

    buildMenu(win : any) {

        let onOpenFileCallback : IOnOpenFileCliked = this.onOpenFileCallback;
        let onExportFileCallback : IOnExportFileCliked = this.onExportFileCallback;

        return Menu.buildFromTemplate([
            {
                label: 'File',
                submenu: [
                    { label: 'Open recording...', click: onOpenFileCallback },
                    { label: 'Open recent', submenu: this.recentSubmenu },
                    { type: 'separator' },
                    { label: 'Export recording...', click: onExportFileCallback },
                    { label: 'Exit', role: 'quit' }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    {label: 'Undo', role: 'undo'  },
                    {label: 'Redo', role: 'redo'  },
                    {label: 'Cut', role: 'cut'  },
                    {label: 'Copy', role: 'copy'  },
                    {label: 'Paste', role:'paste'  },
                ]
            },
            {
                label: 'Custom Menu', 
                submenu: [/* We'll add more actions */]
            }

        ])
    }
}
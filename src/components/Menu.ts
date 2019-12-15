import { app, Menu } from "electron";

export default function(win : any){
    return Menu.buildFromTemplate([
        {
            label: 'File',
            submenu: [
                { label: 'Open recording...' },
                { label: 'Open recent', submenu: [
                    { label: 'Example file.fbf' },
                ]},
                { type: 'separator' },
                { label: 'Export recording...' },
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
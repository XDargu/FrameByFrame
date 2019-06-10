import { app, Menu } from "electron";

export default function(win : any){
    return Menu.buildFromTemplate([
        {
            label: app.getName(),
            submenu: [
                { label: `Hello`, click: () => console.log("Hello world") }
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
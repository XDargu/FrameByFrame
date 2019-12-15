import { app, remote, dialog } from "electron";
import * as fs from 'fs';
import * as path from 'path';

export interface IOpenFileCallback
{
    (path: string, content: string) : void;
}

export default class FileManager
{
    constructor()
    {
        
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

            fs.readFile(paths[0], 'utf-8', (err, data) => {
                if(err){
                    alert("An error ocurred reading the file :" + err.message);
                    return;
                }
        
                // Change how to handle the file content
                console.log("The file content is : " + data);

                callback(paths[0], data);
            });
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
                            
                console.log("The file has been succesfully saved");
            });
        });
    }
}
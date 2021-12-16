import * as path from "path";
import { addContextMenu } from "./ContextMenu";

export interface IFileClicked
{
    (path: string) : void
}

export default class FileListController
{
    private welcomeList: HTMLElement;
    private recentFilesList: HTMLElement;
    private onFileClicked: IFileClicked;
    private onFileOpenInExplorer: IFileClicked;

    constructor(recentFilesList: HTMLElement, welcomeList: HTMLElement, onFileClicked: IFileClicked, onFileOpenInExplorer: IFileClicked)
    {
        this.recentFilesList = recentFilesList;
        this.welcomeList = welcomeList;
        this.onFileClicked = onFileClicked;
        this.onFileOpenInExplorer = onFileOpenInExplorer;
    }

    updateRecentFiles(paths: string[])
    {
        this.recentFilesList.innerHTML = paths.reduce((accumulator, currentValue) => { 
            return accumulator + `<div data-path="${currentValue}" class="basico-list-item" title="${currentValue}">${currentValue}</div>`;
        }, "");

        const maxRecentFiles = 4;
        this.welcomeList.innerHTML = paths.slice(0, maxRecentFiles).reduce((accumulator, currentValue) => {
            const name = path.basename(currentValue);
            const dir = path.dirname(currentValue);
            return accumulator + `<li data-path="${currentValue}"><p><b>${name}</b>${dir}</p></li>`;
        }, "");

        const applyCallback = (collection: HTMLCollection) => {
            for (let child of collection)
            {
                let recentFileElement = child as HTMLElement;
                recentFileElement.onclick = () => {
                    this.onFileClicked(recentFileElement.getAttribute("data-path"));
                };

                // Context menu
                const config = [
                    { text: "Show in explorer", icon: "fa-folder-open", callback: () => { this.onFileOpenInExplorer(recentFileElement.getAttribute("data-path")); } },
                ];
                addContextMenu(recentFileElement, config);
            }
        }

        applyCallback(this.recentFilesList.children);
        applyCallback(this.welcomeList.children);
        
    }
}
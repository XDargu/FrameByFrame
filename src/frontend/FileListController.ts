import * as path from "path";

export interface IFileClicked
{
    (path: string) : void
}

export default class FileListController
{
    private welcomeList: HTMLElement;
    private recentFilesList: HTMLElement;
    private onFileClicked: IFileClicked;

    constructor(recentFilesList: HTMLElement, welcomeList: HTMLElement, onFileClicked: IFileClicked)
    {
        this.recentFilesList = recentFilesList;
        this.welcomeList = welcomeList;
        this.onFileClicked = onFileClicked;
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
            }
        }

        applyCallback(this.recentFilesList.children);
        applyCallback(this.welcomeList.children);
        
    }
}
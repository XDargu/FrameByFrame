export interface IFileClicked
{
    (path: string) : void
}

export default class FileListController
{
    private connectionsList: HTMLElement;
    private onFileClicked: IFileClicked;

    constructor(connectionsList: HTMLElement, onFileClicked: IFileClicked)
    {
        this.connectionsList = connectionsList;
        this.onFileClicked = onFileClicked;
    }

    updateRecentFiles(paths: string[])
    {
        this.connectionsList.innerHTML = paths.reduce((accumulator, currentValue) => { 
            return accumulator + `<div class="basico-list-item">${currentValue}</div>`;
        }, "");

        let control = this;
        for (let child of this.connectionsList.children)
        {
            let recentFileElement = child as HTMLElement;
            recentFileElement.onclick = function() {
                control.onFileClicked(recentFileElement.textContent);
            };
        }
    }
}
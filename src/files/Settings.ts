export interface ISettings
{
    recordOnConnect: boolean,
    autoReconnect: boolean,
    moveToEntityOnSelection: boolean,
    openEntityListOnSelection: boolean,
    followCurrentSelection: boolean,
    showAllLayersOnStart: boolean,
    showRenderDebug: boolean,
    antialiasingSamples: number,
    exportNameFormat: string,
}

export function createDefaultSettings() : ISettings
{
    return {
        /* Connections */
        recordOnConnect: true,
        autoReconnect: true,
        /* Viewer */
        moveToEntityOnSelection: true,
        openEntityListOnSelection: true,
        followCurrentSelection: false,
        showAllLayersOnStart: true,
        /* Export */
        exportNameFormat: "recording_%Y-%M-%D_%h:%m:%s",
        /* Debug */
        showRenderDebug: false,
        /* Graphics */
        antialiasingSamples: 4,
    };
}
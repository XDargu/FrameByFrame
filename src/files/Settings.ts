export interface ISettings
{
    /* Connections */
    recordOnConnect: boolean,
    autoReconnect: boolean,
    defaultPort: string,
    /* Viewer */
    moveToEntityOnSelection: boolean,
    openEntityListOnSelection: boolean,
    followCurrentSelection: boolean,
    showAllLayersOnStart: boolean,
    backgroundColor: string,
    /* Grid */
    gridHeight: number,
    gridSpacing: number,
    /* Export */
    exportNameFormat: string,
    /* Debug */
    showRenderDebug: boolean,
    /* Graphics */
    antialiasingSamples: number,
}

export function createDefaultSettings() : ISettings
{
    return {
        /* Connections */
        recordOnConnect: true,
        autoReconnect: true,
        defaultPort: "23001",
        /* Viewer */
        moveToEntityOnSelection: true,
        openEntityListOnSelection: true,
        followCurrentSelection: false,
        showAllLayersOnStart: true,
        backgroundColor: "#33334C",
        /* Grid */
        gridHeight: 0,
        gridSpacing: 1,
        /* Export */
        exportNameFormat: "recording_%Y-%M-%D_%h:%m:%s",
        /* Debug */
        showRenderDebug: false,
        /* Graphics */
        antialiasingSamples: 4,
    };
}
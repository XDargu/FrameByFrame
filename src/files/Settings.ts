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
    highlightShapesOnHover: boolean,
    backgroundColor: string,
    selectionColor: string,
    hoverColor: string,
    shapeHoverColor: string,
    selectionOutlineWidth: number,
    /* Syncing */
    syncVisibleShapes: boolean,
    syncCameraPosition: boolean,
    /* Timeline */
    showEventPopup: boolean,
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
        highlightShapesOnHover: true,
        backgroundColor: "#33334C",
        selectionColor: "#6DE080",
        hoverColor: "#8442B9",
        shapeHoverColor: "#FFFF00",
        selectionOutlineWidth: 1,
        /* Syncing */
        syncVisibleShapes: false,
        syncCameraPosition: false,
        /* Timeline */
        showEventPopup: true,
        /* Grid */
        gridHeight: 0,
        gridSpacing: 1,
        /* Export */
        exportNameFormat: "recording_%Y-%M-%D_%h_%m_%s",
        /* Debug */
        showRenderDebug: false,
        /* Graphics */
        antialiasingSamples: 4,
    };
}
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
    showShapeLineOnHover: boolean,
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
    /* Recording */
    removeOldFrames: boolean,
    removeOldFramesAmount: number,
    removeOldFramesUpdate: boolean,
    /* Debug */
    showRenderDebug: boolean,
    /* Graphics */
    antialiasingSamples: number,
    lightIntensity: number,
    backFaceCulling: boolean,
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
        showShapeLineOnHover: true,
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
        /* Recording */
        removeOldFrames: false,
        removeOldFramesAmount: 500,
        removeOldFramesUpdate: true,
        /* Debug */
        showRenderDebug: false,
        /* Graphics */
        antialiasingSamples: 4,
        lightIntensity: 0.7,
        backFaceCulling: true,
    };
}
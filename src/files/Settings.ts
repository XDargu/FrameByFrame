export interface ISettings
{
    recordOnConnect: boolean,
    autoReconnect: boolean,
    moveToEntityOnSelection: boolean,
    openEntityListOnSelection: boolean,
    followCurrentSelection: boolean,
    showAllLayersOnStart: boolean,
    showRenderDebug: boolean,
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
        /* Debug */
        showRenderDebug: false,
    };
}
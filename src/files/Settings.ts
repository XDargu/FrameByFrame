export interface ISettings
{
    recordOnConnect: boolean,
    autoReconnect: boolean,
    moveToEntityOnSelection: boolean,
    openEntityListOnSelection: boolean
}

export function createDefaultSettings() : ISettings
{
    return {
        recordOnConnect: true,
        autoReconnect: true,
        moveToEntityOnSelection: true,
        openEntityListOnSelection: true,
    };
}
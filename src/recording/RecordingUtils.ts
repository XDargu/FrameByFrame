import * as RECORDING from './RecordingData';
import * as Utils from "../utils/utils";

export function collectHistoricalData(recordedData: RECORDING.NaiveRecordedData, currentFrame: number, length: number, flags: RECORDING.BuildFrameDataFlags)
{
    let historicalFrameData = [];
    const start = Math.max(0, currentFrame - length);

    for (let i=start; i<=currentFrame; ++i)
    {
        const frameData = recordedData.buildFrameData(i, flags);
        historicalFrameData.push(frameData);
    }

    return historicalFrameData;
}

export function collectHistoricalEntityPositions(historicalFrameData: RECORDING.IFrameData[], entityID: number)
{
    let values : RECORDING.IVec3[] = [];
    for (let i=0; i<historicalFrameData.length; ++i)
    {
        const testEntity = historicalFrameData[i].entities[entityID];
        if (testEntity)
        {
            values.push(RECORDING.NaiveRecordedData.getEntityPosition(testEntity));
        }
    }

    return values;
}

export function tryGetValidEntityID(frameData: RECORDING.IFrameData, id: number)
{
    if (frameData.entities[id])
        return id;

    const uniqueId = Utils.toUniqueID(frameData.clientId, id);
    if (frameData.entities[uniqueId])
        return uniqueId;
    
    const extractId = Utils.getEntityIdUniqueId(id);
    if (frameData.entities[extractId])
    {
        return extractId;
    }

    return null;
}

export function tryGetUniqueID(header: RECORDING.IFrameData, id: number)
{
    if (header.entities[id])
    {
        // We need to convert to unique id
        return Utils.toUniqueID(header.clientId, id);
    }
    else
    {
        // Verify it is a valid unique ID
        const entityId = Utils.getEntityIdUniqueId(id);
        if (header.entities[entityId])
        {
            return id;
        }
    }

    return null;
}
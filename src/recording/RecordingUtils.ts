import * as RECORDING from './RecordingData';

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
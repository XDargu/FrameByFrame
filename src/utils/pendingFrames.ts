import * as RECORDING from '../recording/RecordingData';

export interface PendingFramesCallback
{
    (frameData: RECORDING.IFrameData, frameIdx: number) : void
}

export default class PendingFrames
{
    private pendingFrames: number[] = [];
    private areAllPending: boolean = false;

    forEachPendingFrame(recordedData: RECORDING.INaiveRecordedData, callback: PendingFramesCallback)
    {
        if (this.areAllPending)
        {
            for (let i=0; i<recordedData.frameData.length; ++i)
            {
                callback(recordedData.frameData[i], i);
            }
        }
        else
        {
            for (let i=0; i<this.pendingFrames.length; ++i)
            {
                callback(recordedData.frameData[i], i);
            }
        }
    }

    areAllFramesPending() : boolean
    {
        return this.areAllPending;
    }

    pushPending(value: number)
    {
        this.pendingFrames.push(value);
    }

    markAllPending()
    {
        this.pendingFrames.length = 0;
        this.areAllPending = true;
    }

    clear()
    {
        this.pendingFrames.length = 0;
        this.areAllPending = false;
    }
}
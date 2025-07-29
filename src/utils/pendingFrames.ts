import * as RECORDING from '../recording/RecordingData';
import * as Utils from "../utils/utils";

export interface PendingFramesCallback
{
    (frameData: RECORDING.IFrameData, frameIdx: number) : void
}

export default class PendingFrames
{
    pendingFrames: number[] = [];
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
                const pendingFrame = this.pendingFrames[i];
                callback(recordedData.frameData[pendingFrame], pendingFrame);
            }
        }
    }

    areAllFramesPending() : boolean
    {
        return this.areAllPending;
    }

    pushPending(value: number)
    {
        Utils.pushUnique(this.pendingFrames, value);
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
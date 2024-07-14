import * as FileRec from "../recording/FileRecording";
import * as RECORDING from '../recording/RecordingDefinitions';
import * as Utils from "../utils/utils";

export interface PendingFramesCallback
{
    (frameData: RECORDING.IFrameData, frameIdx: number) : void
}

export default class PendingFrames
{
    private pendingFrames: number[] = [];
    private areAllPending: boolean = false;

    forEachPendingFrame(recordedData: FileRec.FileRecording, callback: PendingFramesCallback)
    {
        if (this.areAllPending)
        {
            recordedData.forEachFrameData((val, idx) => {
                callback(val, idx);
            });
        }
        else
        {
            for (let i=0; i<this.pendingFrames.length; ++i)
            {
                const frameIdx = this.pendingFrames[i];
                const frameData = recordedData.getFrameData(frameIdx);
                if (frameData)
                    callback(frameData, frameIdx);
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
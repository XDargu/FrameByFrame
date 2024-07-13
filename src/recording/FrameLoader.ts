import * as RECORDING from './RecordingDefinitions';
import * as Messaging from "../messaging/MessageDefinitions";
import * as FileRec from './FileRecording';
import { ipcRenderer } from "electron";

export interface FrameChunk
{
    path: string,
    init: number, // Inclusive
    end: number, // Inclusive
    frameData: RECORDING.IFrameData[],
}

interface ChunkRequestCallback
{
    (result: Messaging.ILoadFrameChunksResult) : void;
}

interface ActiveRequest
{
    init: number, // Inclusive
    end: number, // Inclusive
    callback: ChunkRequestCallback
}

export class FrameLoader
{
    // Requests handling
    private idGenerator: number;
    private activeRequests: Map<number, ActiveRequest>;

    // Absolute path pointing towards the root folder of uncompressed data
    private root: string;
    private chunks: FrameChunk[];

    constructor()
    {
        this.idGenerator = 0;
        this.activeRequests = new Map<number, ActiveRequest>();
        this.chunks = [];
    }

    updateFrames(fileRecording: FileRec.FileRecording)
    {
        // Temporary test function
        let changes = false;

        for (let i=0; i<this.chunks.length; ++i)
        {
            const chunk = this.chunks[i];

            if (!fileRecording.frameData[chunk.init])
            {
                for (let j=0; j<chunk.frameData.length; ++j)
                {
                    const globalFrame = this.toGlobalIndex(j, chunk);
                    fileRecording.frameData[globalFrame] = chunk.frameData[j];
                }

                changes = true;
            }
        }

        return changes;
    }

    initialize(path: string)
    {
        this.root = path;
        this.chunks = [];
    }

    getFramesLoading()
    {
        let result = "";
        for (let request of this.activeRequests)
        {
            result += `From: ${request[1].init} to ${request[1].end}\n`;
        }

        return result;
    }

    isFrameLoading(frame: number)
    {
        for (let request of this.activeRequests)
        {
            if (request[1].init <= frame && frame <= request[1].end)
            {
                return true;
            }
        }

        return false;
    }

    async requestFrame(frame: number)
    {
        const chunk = this.findChunkByFrame(frame);
        if (chunk)
        {
            const chunkIdx = this.toChunkIndex(frame, chunk);
            return chunk.frameData[chunkIdx];
        }
        
        const resultChunk = await this.requestFrameChunk(frame);

        // Add chunks to existing ones
        for (let chunkRaw of resultChunk.chunks)
        {
            const frameData = JSON.parse(chunkRaw.toString()) as RECORDING.IFrameData[];

            const initFrame = FileRec.Ops.getChunkInit(frame);
            const chunkFilename = FileRec.Ops.getFramePath(this.root, frame);
            const end = initFrame + frameData.length;

            const chunk : FrameChunk = {
                path: chunkFilename,
                init: initFrame,
                end: end,
                frameData: frameData,
            }
            this.addChunk(chunk);
        }

        const newChunk = this.findChunkByFrame(frame);
        if (newChunk)
        {
            const chunkIdx = this.toChunkIndex(frame, newChunk);
            return newChunk.frameData[chunkIdx];
        }

        return null;
    }

    private async requestFrameChunk(frame: number)
    {
        return new Promise<Messaging.ILoadFrameChunksResult>((resolve, reject) =>
        {
            // Calculate the paths to request
            const chunkFilename = FileRec.Ops.getFramePath(this.root, frame);

            // TODO: Also get adjacent chunks, if possible
            console.log("Requesting frame async");
            const id = ++this.idGenerator;
            const request : Messaging.ILoadFrameChunksRequest = {
                id: id,
                paths: [chunkFilename]
            };

            const initFrame = FileRec.Ops.getChunkInit(frame);

            this.activeRequests.set(id, {
                init: initFrame,
                end: initFrame + FileRec.FileRecording.frameCutOff - 1,
                callback: (result) => {
                    resolve(result);
                }
            });

            ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.RequestLoadFrameChunks, request));
        });
    }

    private toChunkIndex(frame: number, chunk: FrameChunk)
    {
        return frame - chunk.init;
    }

    private toGlobalIndex(chunkFrame: number, chunk: FrameChunk)
    {
        return chunk.init + chunkFrame;
    }

    private findChunkByFrame(frame: number)
    {
        for (let i=0; i<this.chunks.length; ++i)
        {
            const chunk = this.chunks[i];
            if (chunk.init <= frame && frame <= chunk.end)
            {
                return chunk;
            }
        }

        return null;
    }

    private addChunk(chunkToAdd: FrameChunk)
    {
        for (let i=0; i<this.chunks.length; ++i)
        {
            const chunk = this.chunks[i];
            if (chunk.init == chunkToAdd.init && chunkToAdd.end == chunkToAdd.end)
            {
                return;
            }
        }

        this.chunks.push(chunkToAdd);
    }

    onFrameChunkResult(result: Messaging.ILoadFrameChunksResult)
    {
        console.log("Chunk result");
        const request = this.activeRequests.get(result.id);
        if (request)
        {
            request.callback(result);
            this.activeRequests.delete(result.id);
        }
    }
}
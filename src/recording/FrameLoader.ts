import * as RECORDING from './RecordingDefinitions';
import * as Messaging from "../messaging/MessageDefinitions";
import * as FileRec from './FileRecording';
import { ipcRenderer } from "electron";
import * as JSONAsync from './asyncJSONService';
import * as Utils from "../utils/utils";

export interface FrameChunk
{
    path: string,
    init: number, // Inclusive
    end: number, // Inclusive
    frameData: RECORDING.IFrameData[],
    lastAccess: number
}

export function toChunkIndex(frame: number, chunk: FrameChunk)
{
    return frame - chunk.init;
}

export function toGlobalIndex(chunkFrame: number, chunk: FrameChunk)
{
    return chunk.init + chunkFrame;
}

interface ActiveRequest
{
    init: number, // Inclusive
    end: number, // Inclusive
    resolve: (value: Messaging.ILoadFrameChunksResult | PromiseLike<Messaging.ILoadFrameChunksResult>) => void,
    reject: (reason?: any) => void,
    received: boolean
}

export class FrameLoader
{
    // Requests handling
    private idGenerator: number;
    private activeRequests: Map<number, ActiveRequest>;

    private chunks: FrameChunk[];

    private maxFrames: number;

    constructor()
    {
        this.idGenerator = 0;
        this.activeRequests = new Map<number, ActiveRequest>();
        this.chunks = [];
        this.maxFrames = 10;
    }

    initialize(path: string)
    {
        this.chunks = [];
    }

    clear()
    {
        this.chunks = [];
        for (let request of this.activeRequests)
        {
            request[1].reject(new Error("Cleared"));
        }
        this.activeRequests.clear();
    }

    notifyFrameAccess(frame: number)
    {
        const chunk = this.findChunkByFrame(frame);
        if (chunk)
        {
            chunk.lastAccess = Date.now();
        }
    }

    removeOldChunks(currentFrame: number, framesPerChunk: number)
    {
        const currentChunk = FileRec.Ops.getChunkInit(currentFrame, framesPerChunk);
        const prevChunk = currentChunk - framesPerChunk;
        const nextChunk = currentChunk + framesPerChunk;

        if (this.chunks.length > this.maxFrames)
        {
            this.chunks.sort((a, b) => {

                // Don't remove our current frame or the adjacent ones
                const isAAdjacent = a.init == currentChunk || a.init == prevChunk || a.init == nextChunk;
                const isBAdjacent = b.init == currentChunk || b.init == prevChunk || b.init == nextChunk;

                if (isAAdjacent && isBAdjacent)
                    return b.lastAccess - a.lastAccess;
                if (isAAdjacent)
                    return -1;
                if (isBAdjacent)
                    return 1;

                return b.lastAccess - a.lastAccess
            });
            const removedChunks = this.chunks.splice(this.maxFrames);
            return removedChunks;
        }

        return [];
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

    async requestFrame(globalData: FileRec.GlobalData, frame: number, callback?: () => void)
    {
        const chunk = this.findChunkByFrame(frame);
        if (chunk)
        {
            const chunkIdx = toChunkIndex(frame, chunk);
            return chunk.frameData[chunkIdx];
        }
        
        const resultChunk = await this.requestFrameChunk(globalData, frame);

        // Add chunks to existing ones
        
        for (let chunkRaw of resultChunk.chunks)
        {
            const frames = 60;
            const bytesPerFrame = chunkRaw.length / frames;
            let bufferValue = '';
            let curBuf = 0;

            while (curBuf < chunkRaw.length)
            {
                //console.log(`Doing ${curBuf}/${chunkRaw.length}`);
                const next = Math.min(curBuf + bytesPerFrame, chunkRaw.length);
                bufferValue += chunkRaw.toString('utf8', curBuf, next);
                curBuf = next;
                await Utils.nextTick();
            }
            
            if (callback)
                callback();
            //const frameData = await JSONAsync.JsonParse(bufferValue) as RECORDING.IFrameData[];
            const frameData = await JSON.parse(bufferValue) as RECORDING.IFrameData[];

            const initFrame = FileRec.Ops.getChunkInit(frame, globalData.framesPerChunk);
            const relChunkFilename = FileRec.Ops.getFramePath('./', frame, globalData.framesPerChunk);
            const end = initFrame + frameData.length;

            const chunk : FrameChunk = {
                path: relChunkFilename,
                init: initFrame,
                end: end,
                frameData: frameData,
                lastAccess: Date.now()
            }
            this.addChunk(chunk);
        }

        this.activeRequests.delete(resultChunk.id);

        const newChunk = this.findChunkByFrame(frame);
        if (newChunk)
        {
            const chunkIdx = toChunkIndex(frame, newChunk);
            return newChunk.frameData[chunkIdx];
        }

        return null;
    }

    private async requestFrameChunk(globalData: FileRec.GlobalData, frame: number)
    {
        return new Promise<Messaging.ILoadFrameChunksResult>((resolve, reject) =>
        {
            // Calculate the paths to request
            const relChunkFilename = FileRec.Ops.getFramePath('./', frame, globalData.framesPerChunk);

            const id = ++this.idGenerator;
            const request : Messaging.ILoadFrameChunksRequest = {
                id: id,
                relativePaths: [relChunkFilename]
            };

            const initFrame = FileRec.Ops.getChunkInit(frame, globalData.framesPerChunk);

            this.activeRequests.set(id, {
                init: initFrame,
                end: initFrame + globalData.framesPerChunk - 1,
                received: false,
                resolve: resolve,
                reject: reject
            });

            ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.RequestLoadFrameChunks, request));
        });
    }

    getChunksAmount()
    {
        return this.chunks.length;
    }

    findChunkByFrame(frame: number)
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

    addChunk(chunkToAdd: FrameChunk)
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
        console.log("Chunk result: " + result.id);
        const request = this.activeRequests.get(result.id);
        if (request)
        {
            request.resolve(result);
            this.activeRequests.get(result.id).received = true;
        }
    }
}
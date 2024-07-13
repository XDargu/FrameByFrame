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
    }

    initialize(path: string)
    {
        this.root = path;
        this.chunks = [];
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
        for (let chunk of resultChunk.chunks)
        {
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

            this.activeRequests.set(id, {
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

    private findChunkByFrame(frame: number)
    {
        for (let i=0; i<this.chunks.length; ++i)
        {
            const chunk = this.chunks[i];
            if (chunk.init >= frame && frame <= chunk.end)
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
        console.log(result);
        const request = this.activeRequests.get(result.id);
        if (request)
        {
            request.callback(result);
            this.activeRequests.delete(result.id);
        }
    }
}
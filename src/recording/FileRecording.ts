import * as RECORDING from './RecordingDefinitions';
import * as path from 'path';

export interface IResource {
    path: string;
    data: Blob;
    textData: string;
    type: string;
}

export interface IResourcesData {
	[key:string]: IResource;
}

export interface IClientData {
	[key:number]: RECORDING.ClientData;
}

export interface GlobalData
{
	layers: string[];
	scenes: string[];
	clientIds: IClientData;
	resources: IResourcesData;
	storageVersion: number;
    totalFrames: number;
}

interface FileRecPaths
{
    globaldata: string,
    frames: string,
    resources: string,
    resImages: string
}

const PathsConstant = {
    globaldata: './globaldata.ffd',
    frames: './frames',
    resources: './resources',
    resImages: './resources/images'
};

export namespace Ops
{
    export function makePaths(rootPath: string) : FileRecPaths
    {
        return {
            globaldata: path.join(rootPath, PathsConstant.globaldata),
            frames: path.join(rootPath, PathsConstant.frames),
            resources: path.join(rootPath, PathsConstant.resources),
            resImages: path.join(rootPath, PathsConstant.resImages)
        };
    }

    export function getFramePath(rootPath: string, frame: number)
    {
        const remainder = frame % FileRecording.frameCutOff;
        const frameNumber = frame - remainder;
        return path.join(rootPath, PathsConstant.frames, `./${frameNumber}.ffd`);
    }
}

export interface IFileRecording {
	root: string;
    paths: FileRecPaths;
    globalData: GlobalData;
    frameData: RECORDING.IFrameData[];
}

export class FileRecording implements IFileRecording
{
    static readonly frameCutOff = 100;
    
    // Absolute path pointing towards the root folder of uncompressed data
    root: string;
    // Absolute paths pointing to different key folders
    paths: FileRecPaths;

    globalData: GlobalData;

    // Sparse array of frame data, it can have gaps. ie: frameData[0] exists and frameData[500] exists, but not frameData[100]
    frameData: RECORDING.IFrameData[];

    constructor()
    {
        this.globalData = {
            layers: [],
            scenes: [],
            clientIds: {},
            resources: {},
            storageVersion: 4,
            totalFrames: 0,
        };
    }

    loadFromData(data: IFileRecording)
    {
        this.root = data.root;
        this.paths = Ops.makePaths(this.root);
        this.globalData = data.globalData;
        this.frameData = data.frameData;
    }

    clear()
    {
        // TODO
    }

    findResource(path: string) : IResource
    {
        // TODO
        return null;
    }

    pushFrame(frame: RECORDING.IFrameData)
    {

    }

    getSize()
    {
        return this.globalData.totalFrames;
    }

    removeFramestAtStart(framesToRemove: number)
    {
        // TODO
    }

    buildFrameDataHeader(frame: number) : RECORDING.IFrameData
    {
        // TODO
        return null;
	}

	buildFrameData(frame : number) : RECORDING.IFrameData
    {
        // TODO
        return null;
	}
}
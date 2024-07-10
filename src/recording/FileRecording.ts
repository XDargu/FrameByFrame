import * as RECORDING from './RecordingDefinitions';
import * as RecOps from './RecordingOperations'
import * as fs from 'fs';
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

interface GlobalData
{
	layers: string[];
	scenes: string[];
	clientIds: IClientData;
	resources: IResourcesData;
	storageVersion: number;
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
            frames: PathsConstant.frames,
            resources: PathsConstant.resources,
            resImages: PathsConstant.resImages
        };
    }

    export async function loadFile(path: string)
    {
        
    }
}

export class FileRecording
{
    // Absolute path pointing towards the root folder of uncompressed data
    root: string;
    // Absolute paths pointing to different key folders
    paths: FileRecPaths;

    globalData: GlobalData;

    // Array of frame data, but can have gats. ie: frameData[0] exists and frameData[500] exists, but not frameData[100]
    frameData: RECORDING.IFrameData[];

    constructor(path: string)
    {
        this.root = path;
        this.paths = Ops.makePaths(path);
    }
}
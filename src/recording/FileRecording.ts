import * as RECORDING from './RecordingDefinitions';
import * as path from 'path';
import * as Utils from '../utils/utils'
import * as RecOps from './RecordingOperations'

export interface IResource {
    path: string;
    data: Blob;
    textData: string;
    type: string;
}

export interface IResourcesData {
	[key:string]: IResource;
}

export interface GlobalData
{
	layers: string[];
	scenes: string[];
	clientIds: Map<number, RECORDING.ClientData>;
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
            clientIds: new Map<number, RECORDING.ClientData>(),
            resources: {},
            storageVersion: 4,
            totalFrames: 0,
        };

        this.root = "";
        this.paths = Ops.makePaths("");
        this.frameData = [];
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

    getTagByClientId(clientId: number) : string
	{
		const data = this.globalData.clientIds.get(clientId);
		return data?.tag;
	}

    findResource(path: string) : IResource
    {
        return this.globalData.resources[path];
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
        let frameData = this.frameData[frame];

		if (!frameData) {
			return RECORDING.emptyFrameData;
		}

		let dataPerClientID = new Map<number, RECORDING.IFrameData>();
		dataPerClientID.set(frameData.clientId, frameData);
		const maxPrevFrames = 10;
		for (let i=0; i<maxPrevFrames; ++i)
		{
			const prevFrameData = this.frameData[frame - i - 1];
			if (prevFrameData) {
				const prevFrameClientId = prevFrameData.clientId;
				if (!dataPerClientID.has(prevFrameClientId)) {
					dataPerClientID.set(prevFrameClientId, prevFrameData);
				}
			}
		}

		let mergedFrameData : RECORDING.IFrameData = {
			entities: {},
			serverTime: frameData.serverTime,
			clientId: frameData.clientId,
			frameId: frameData.frameId,
			elapsedTime: frameData.elapsedTime,
			tag: frameData.tag,
			scene: frameData.scene,
			coordSystem: frameData.coordSystem
		};

		// Merge all entities
		for (let [clientID, frameData] of dataPerClientID)
		{
			for (let entityID in frameData.entities)
			{
				const entity = frameData.entities[entityID];
				const uniqueID = Utils.toUniqueID(frameData.clientId, entity.id);
				const parentUniqueID = entity.parentId == 0 ? 0 : Utils.toUniqueID(frameData.clientId, entity.parentId);
				mergedFrameData.entities[uniqueID] = {
					id: uniqueID,
					parentId: parentUniqueID,
					properties: entity.properties,
					events: entity.events
				};
			}
		}

		let eventId = 1;
		let propId = 1;
		
		for (let id in mergedFrameData.entities)
		{
			RecOps.visitProperties(mergedFrameData.entities[id].properties, (property: RECORDING.IProperty) => {
				property.id = propId++;
			});
			RecOps.visitEvents(mergedFrameData.entities[id].events, (event: RECORDING.IEvent) => {
				event.id = eventId++;

				RecOps.visitProperties([event.properties], (property: RECORDING.IProperty) => {
					property.id = propId++;
				});
			});
		}
		
		return mergedFrameData;
	}
}
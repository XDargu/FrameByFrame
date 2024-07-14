import * as RECORDING from './RecordingDefinitions';
import * as path from 'path';
import * as Utils from '../utils/utils'
import * as RecOps from './RecordingOperations'
import { CorePropertyTypes } from '../types/typeRegistry';
import * as FrameLoader from './FrameLoader';

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

    export function getChunkInit(frame: number)
    {
        const remainder = frame % FileRecording.frameCutOff;
        return frame - remainder;
    }

    export function getFramePath(rootPath: string, frame: number)
    {
        const frameNumber = getChunkInit(frame);
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

        this.globalData.clientIds = new Map<number, RECORDING.IFrameData>();
    }

    clear()
    {
        this.root = "";
        this.paths = Ops.makePaths("");
        this.frameData = [];
        this.globalData = {
            layers: [],
            scenes: [],
            clientIds: new Map<number, RECORDING.ClientData>(),
            resources: {},
            storageVersion: 4,
            totalFrames: 0,
        };

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
        let frameData = this.frameData[frame];

		if (!frameData) {
			return RECORDING.emptyFrameData;
		}

        return frameData;
	}

    getFrameData(frame: number) : RECORDING.IFrameData
    {
        return this.frameData[frame];
    }

    forEachFrameData(callback : (value: RECORDING.IFrameData, index: number, array: RECORDING.IFrameData[]) => void)
    {
        this.frameData.forEach(callback);
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

    pushFrame(frame: RECORDING.IFrameData)
	{
		Utils.insertSorted(this.frameData, frame, (value, frameData) => {
			return value.serverTime > frameData.serverTime;
		});

		this.updateLayersAndResourcesOfFrame(frame);
		this.updateScenesOfFrame(frame);
		this.updateClientIDSOfFrame(frame);

        this.globalData.totalFrames++;
	}

    addTestData(frames: number, entityAmount: number)
    {
        this.globalData.totalFrames = frames;

		for (let i=0; i<frames; ++i)
		{
			let frameData : RECORDING.IFrameData = { entities: {}, frameId: i, elapsedTime: 0.0166, clientId: 0, serverTime: i, tag: "", scene: "", coordSystem: RECORDING.ECoordinateSystem.LeftHand };
			
			for (let j=0; j<entityAmount; ++j)
			{
				const entityID = j + 1;

				let entity : RECORDING.IEntity = { id: entityID, parentId: 0, properties: [], events: [] };
				
				let propertyGroup = { type: CorePropertyTypes.Group, name: "properties", value: [
					{ type: CorePropertyTypes.Number, name: "Target ID", value: 122 },
					{ type: CorePropertyTypes.String, name: "Target Name", value: "Player" },
					{ type: CorePropertyTypes.Number, name: "Target Distance", value: j },
					{ type: CorePropertyTypes.Group, name: "Target Info", value: [
						{ type: CorePropertyTypes.Number, name: "Target Radius", value: i },
						{ type: CorePropertyTypes.Number, name: "Target Length", value: Math.random() * 20 }
						] }
					]
				};

				let specialGroup = { type: CorePropertyTypes.Group, name: "special", value: [
					{ type: CorePropertyTypes.String, name: "Name", value: "My Entity Name " + entityID },
					{ type: CorePropertyTypes.Vec3, name: "Position", value: { x: Math.random() * 10, y: Math.random() * 10, z: Math.random() * 10} }
					]
				};

                specialGroup.value.push(
                    { type: CorePropertyTypes.Vec3, name: "Up", value: { x: Math.random(), y: Math.random(), z: Math.random() } },
                    { type: CorePropertyTypes.Vec3, name: "Forward", value: { x: Math.random(), y: Math.random(), z: Math.random() } }
                );

				if (i % 2 == 0)
				{
					let eventProperties = [
						{ name: "Test string", type: CorePropertyTypes.String, value: "eventProp" + i },
						{ name: "Test number", type: CorePropertyTypes.Number, value: j }
					];
					let event = {
						idx: 0,
						name: "OnTestEvent",
						tag: "FirstTest",
						properties: {value: eventProperties, type: CorePropertyTypes.Group, name: "properties" }
					};
					entity.events.push(event);
				}
				else
				{
					let eventProperties2 = [
						{ name: "Test other string", type: CorePropertyTypes.String, value: "eventProp" + i },
						{ name: "Test other number", type: CorePropertyTypes.Number, value: j }
					];
					let event2 = {
						idx: 0,
						name: "OnOtherTestEvent",
						tag: "OtherTest",
						properties: {value: eventProperties2, type: CorePropertyTypes.Group, name: "properties" }
					};
					entity.events.push(event2);
				}

				entity.properties.push(propertyGroup);
				entity.properties.push(specialGroup);

				frameData.entities[entity.id] = entity;
			}

			this.pushFrame(frameData);
		}
	}

    addFrameChunk(chunk: FrameLoader.FrameChunk)
    {
        let hasChanged = false;

        if (!this.frameData[chunk.init])
        {
            for (let j=0; j<chunk.frameData.length; ++j)
            {
                const globalFrame = FrameLoader.toGlobalIndex(j, chunk);
                const frameData = chunk.frameData[j];
                this.frameData[globalFrame] = frameData;

                // Update client
                this.updateClientIDSOfFrame(frameData);
                this.updateLayersAndResourcesOfFrame(frameData);
                this.updateScenesOfFrame(frameData);

                // Update layers and resources
            }

            hasChanged = true;
        }

        return hasChanged;
    }

    removeFrameChunks(chunks : FrameLoader.FrameChunk[])
    {
        for (let chunk of chunks)
        {
            for (let j=0; j<chunk.frameData.length; ++j)
            {
                const globalFrame = FrameLoader.toGlobalIndex(j, chunk);
                delete this.frameData[globalFrame];
            }
        }
    }

    private updateClientIDSOfFrame(frameData: RECORDING.IFrameData)
    {
        if (frameData.clientId != undefined && !this.globalData.clientIds.has(frameData.clientId))
        {
            this.globalData.clientIds.set(frameData.clientId, { tag: frameData.tag });
        }
    }

    private updateLayersAndResourcesOfFrame(frame: RECORDING.IFrameData) {
        
		let layerMap: Map<string, boolean> = new Map<string, boolean>();
        let resources = this.globalData.resources;

		for (let id in frame.entities) {
			let visitor = (property: RECORDING.IProperty) => {

                // Layer
				const layer: string = (property as any).layer;
				if (layer != undefined) {
					layerMap.set(layer, true);
				}

                // Resource
                if (RECORDING.isPropertyTextured(property))
                {
                    const shape = property as RECORDING.IPropertyTextured;
                    if (shape.texture)
                    {
                        if (!resources[shape.texture]) {
                            resources[shape.texture] = {
                                path: shape.texture,
                                data: null,
                                textData: null,
                                type: null,
                            };
                        }
                    }
                }
			};
			RecOps.visitProperties(frame.entities[id].properties, visitor);
			RecOps.visitEvents(frame.entities[id].events, (event: RECORDING.IEvent) => {
				RecOps.visitProperties([event.properties], visitor);
			});
		}

		for (let layer of layerMap) {
			this.addLayer(layer[0]);
		}
	}

    private updateScenesOfFrame(frame: RECORDING.IFrameData)
    {
		// TODO: Optimize this.
		if (frame.scene && !this.globalData.scenes.includes(frame.scene)) {
			this.globalData.scenes.push(frame.scene);
		}
	}

    private addLayer(name: string)
    {
		// TODO: Optimize this
		if (!this.globalData.layers.includes(name)) {
			this.globalData.layers.push(name);
		}
	}

}
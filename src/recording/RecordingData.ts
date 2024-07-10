import { CorePropertyTypes } from '../types/typeRegistry';
import * as Utils from '../utils/utils'
import { ECoordinateSystem, emptyFrameData, IEntity, IEvent, IFrameData, IProperty, IPropertyGroup, IPropertyTextured, isPropertyTextured, IVec3, Props, RecordingFileType } from './RecordingDefinitions'
import * as RecOps from './RecordingOperations'

export interface ClientData
{
	tag: string;
}

export interface IRecordedData {
	type: RecordingFileType;
}

export interface IResource {
    path: string;
    data: Blob;
    textData: string;
    type: string;
}

export interface IResourcesData {
	[key:string]: IResource;
}

export interface INaiveRecordedData extends IRecordedData {
	version: number;
	storageVersion: number; // Version of the data file before patching
	frameData: IFrameData[];
	layers: string[];
	scenes: string[];
	clientIds: Map<number, ClientData>;
    resources: IResourcesData;
}

export class NaiveRecordedData implements INaiveRecordedData {
	readonly version: number = 3;
	readonly type: RecordingFileType = RecordingFileType.NaiveRecording;
	frameData: IFrameData[];
	layers: string[];
	scenes: string[];
	clientIds: Map<number, ClientData>
	resources: IResourcesData;
	storageVersion: number;

	constructor() {
		this.frameData = [];
		this.layers = [];
		this.scenes = [];
		this.clientIds = new Map<number, ClientData>();
		this.resources = {};
		this.storageVersion = this.version;
	}

    findResource(path: string) : IResource
    {
        return this.resources[path];
    }	

	loadFromData(dataJson: INaiveRecordedData)
	{
		this.frameData = dataJson.frameData;
		this.layers = dataJson.layers;
		this.scenes = dataJson.scenes;
		this.storageVersion = dataJson.storageVersion != undefined ? dataJson.storageVersion : dataJson.version;
        this.resources = dataJson.resources;

		if (this.layers == undefined)
		{
			this.layers = [];
		}

		for (let frame of this.frameData)
		{
			this.updateLayersAndResourcesOfFrame(frame);
			this.updateScenesOfFrame(frame);
			this.updateClientIDsOfFrame(frame);

			// Fix legacy frames (just for testing)
			if (frame.clientId == null) { frame.clientId = 0; }
			if (frame.tag == null) { frame.tag = "Client"; }
		}

		this.patch(dataJson.version);

		console.log(this);
	}

	patch(version: number)
	{
		if (version == 1)
		{
			this.patchVersion1();
			this.patchVersion2();
		}

		if (version == 2)
		{
			this.patchVersion2();
		}
	}

	private patchVersion1()
	{
		// Converts from version 1 to version 2
		const upLH = { x: 0, y: 1, z: 0};
		const forwardLH = { x: 0, y: 0, z: 1};
		
		const upRH = { x: 0, y: 0, z: 1};
		const forwardRH = { x: 0, y: 1, z: 0};
		for (let frame of this.frameData)
		{
			const isRightHand = frame.coordSystem != undefined && frame.coordSystem == ECoordinateSystem.RightHand;
			for (let entityID in frame.entities)
			{
				let entity = frame.entities[entityID];
				if ((entity.properties[1] as IPropertyGroup).value[2] == undefined)
					(entity.properties[1] as IPropertyGroup).value[2] = { type: CorePropertyTypes.Vec3, name: "Up", value: isRightHand ? upRH : upLH };

				if ((entity.properties[1] as IPropertyGroup).value[3] == undefined)
					(entity.properties[1] as IPropertyGroup).value[3] = { type: CorePropertyTypes.Vec3, name: "Forward", value: isRightHand ? forwardRH : forwardLH };
			}
		}
	}

	private patchVersion2()
	{
		// Converts from version 2 to version 3
		if (this.scenes == undefined)
		{
			this.scenes = [];
		}
	}

	clear()
	{
		this.frameData.length = 0;
		this.layers.length = 0;
		this.scenes.length = 0;
		this.clientIds.clear();
        this.resources = {};
	}

	pushFrame(frame: IFrameData)
	{
		Utils.insertSorted(this.frameData, frame, (value, frameData) => {
			return value.serverTime > frameData.serverTime;
		});

		this.updateLayersAndResourcesOfFrame(frame);
		this.updateScenesOfFrame(frame);
		this.updateClientIDsOfFrame(frame);
	}

	

	buildFrameDataHeader(frame: number) : IFrameData {
		let frameData = this.frameData[frame];

		if (!frameData) {
			return emptyFrameData;
		}

		return frameData;
	}

	buildFrameData(frame : number) : IFrameData {

		let frameData = this.frameData[frame];

		if (!frameData) {
			return emptyFrameData;
		}

		let dataPerClientID = new Map<number, IFrameData>();
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

		let mergedFrameData : IFrameData = {
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
			RecOps.visitProperties(mergedFrameData.entities[id].properties, (property: IProperty) => {
				property.id = propId++;
			});
			RecOps.visitEvents(mergedFrameData.entities[id].events, (event: IEvent) => {
				event.id = eventId++;

				RecOps.visitProperties([event.properties], (property: IProperty) => {
					property.id = propId++;
				});
			});
		}
		
		return mergedFrameData;
	}

	getSize()
	{
		return this.frameData.length;
	}

	addTestData(frames: number, entityAmount: number, version: number = this.version) {
		for (let i=0; i<frames; ++i)
		{
			let frameData : IFrameData = { entities: {}, frameId: i, elapsedTime: 0.0166, clientId: 0, serverTime: i, tag: "", scene: "", coordSystem: ECoordinateSystem.LeftHand };
			
			for (let j=0; j<entityAmount; ++j)
			{
				const entityID = j + 1;

				let entity : IEntity = { id: entityID, parentId: 0, properties: [], events: [] };
				
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

				if (version >= 2)
				{
					specialGroup.value.push(
						{ type: CorePropertyTypes.Vec3, name: "Up", value: { x: Math.random(), y: Math.random(), z: Math.random() } },
						{ type: CorePropertyTypes.Vec3, name: "Forward", value: { x: Math.random(), y: Math.random(), z: Math.random() } }
					);
				}

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

	getTagByClientId(clientId: number) : string
	{
		const data = this.clientIds.get(clientId);
		return data?.tag;
	}

	private updateClientIDsOfFrame(frame: IFrameData)
	{
		if (frame.clientId != undefined && !this.clientIds.has(frame.clientId))
		{
			this.clientIds.set(frame.clientId, { tag: frame.tag });
		}
	}
	private updateLayersAndResourcesOfFrame(frame: IFrameData) {
        
		let layerMap: Map<string, boolean> = new Map<string, boolean>();
        let resources = this.resources;

		for (let id in frame.entities) {
			let visitor = (property: IProperty) => {

                // Layer
				const layer: string = (property as any).layer;
				if (layer != undefined) {
					layerMap.set(layer, true);
				}

                // Resource
                if (isPropertyTextured(property))
                {
                    const shape = property as IPropertyTextured;
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
			RecOps.visitEvents(frame.entities[id].events, (event: IEvent) => {
				RecOps.visitProperties([event.properties], visitor);
			});
		}

		for (let layer of layerMap) {
			this.addLayer(layer[0]);
		}
	}

	private updateScenesOfFrame(frame: IFrameData) {
		// TODO: Optimize this.
		if (frame.scene && !this.scenes.includes(frame.scene)) {
			this.scenes.push(frame.scene);
		}
	}

	private addLayer(name: string) {
		// TODO: Optimize this
		if (!this.layers.includes(name)) {
			this.layers.push(name);
		}
	}
}
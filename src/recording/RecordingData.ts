import { CorePropertyTypes } from '../types/typeRegistry';
import * as Utils from '../utils/utils'

export enum ECoordinateSystem
{
    RightHand = 0,
    LeftHand
}

export enum RecordingFileType {
	NaiveRecording,
	RawFrames
}

export function isPropertyShape(property: IProperty)
{
    const Type = CorePropertyTypes;
    return property.type == Type.Sphere || 
        property.type == Type.Line ||
		property.type == Type.Arrow ||
		property.type == Type.Vector ||
        property.type == Type.Plane ||
        property.type == Type.AABB ||
        property.type == Type.OOBB ||
        property.type == Type.Capsule ||
        property.type == Type.Mesh;
}

export interface IVec3 {
	x: number;
	y: number;
	z: number;
}

export interface IColor {
	r: number;
	g: number;
	b: number;
	a: number;
}

export interface IPropertyCustomType {
	[nameId: string] : string | number | boolean;
}

export interface IProperty {
	type: string;
	name?: string;
	value: string | number | boolean | IVec3 | IPropertyCustomType | IProperty[];
	id?: number;
}

export interface IProperyShape extends IProperty {
	layer: string;
	color: IColor;
}

export interface IPropertySphere extends IProperyShape {
	position: IVec3;
	radius: number;
	value: string;
}

export interface IPropertyCapsule extends IProperyShape {
	position: IVec3;
	direction: IVec3;
	radius: number;
	height: number;
	value: string;
}

export interface IPropertyAABB extends IProperyShape {
	position: IVec3;
	size: IVec3;
	value: string;
}

export interface IPropertyOOBB extends IProperyShape {
	position: IVec3;
	size: IVec3;
	up: IVec3;
	forward: IVec3;
	value: string;
}

export interface IPropertyPlane extends IProperyShape {
	position: IVec3;
	normal: IVec3;
	up: IVec3;
	width: number;
	length: number;
	value: string;
}

export interface IPropertyLine extends IProperyShape {
	origin: IVec3;
	destination: IVec3;
	value: string;
}

export interface IPropertyArrow extends IProperyShape {
	origin: IVec3;
	destination: IVec3;
	value: string;
}

export interface IPropertyVector extends IProperyShape {
	vector: IVec3;
	value: string;
}

export interface IPropertyMesh extends IProperyShape {
	vertices: number[];
	indices?: number[];
	wireframe?: boolean;
	value: string;
}

export interface IPropertyGroup {
	type: string;
	name: string;
	value: IProperty[];
	id?: number;
}

export interface IEvent {
	name: string;
	tag: string;
	properties: IPropertyGroup;
	idx: number;
	id?: number;
}

export interface IEntity {
	id: number;
	parentId: number;
	groupMap?: any;
	properties: IPropertyGroup[];
	events: IEvent[];
}

export interface IFrameEntityData {
	[key:number]: IEntity;
}

export interface INavMeshTriangle {
	v1: IVec3;
	v2: IVec3;
	v3: IVec3;
}

export interface IFrameData {
	entities: IFrameEntityData;
	serverTime: number;
	clientId: number;
	frameId: number;
	elapsedTime: number;
	tag: string;
	coordSystem?: ECoordinateSystem;
}

export enum VisitorResult
{
	Continue,
	Stop
}

export interface IPropertyVisitorCallback
{
    (property: IProperty) : VisitorResult | void
}

export interface IEventVisitorCallback
{
    (event: IEvent) : VisitorResult | void
}

const emptyFrameData: IFrameData = {
	entities: [],
	frameId: 0,
	serverTime: 0,
	elapsedTime: 0,
	clientId: 0,
	tag: "",
	coordSystem: ECoordinateSystem.LeftHand
};

export class PropertyTable {
	types: any[];
	names: string[];
	parentIDs: number[];
	size: number;
	
	constructor() {
		this.types = [];
		this.names = [];
		this.parentIDs = [];
		this.size = 0;
	}
	
	// You need to know your parent ID in order to register an entry
	registerEntry(type : any, name : string, parentID : number) {
		
		const entryID = this.findEntryID(type, name, parentID);
		if (entryID == -1)
		{
			this.types.push(type);
			this.names.push(name);
			this.parentIDs.push(parentID);
			this.size++;
			
			return this.size - 1;
		}
		
		return entryID;
	}
	
	findEntryID(type : any, name : string, parentID : number) : number {
		for (let i=0; i<this.size; i++) {
			if (this.names[i] == name && this.parentIDs[i] == parentID && this.types[i] == type) {
				return i;
			}
		}
		
		return -1;
	}
}

export class ValueTable {
	values: any[];
	size: number;
	constructor() {
		this.values = [];
		this.size = 0;
	}
	
	registerEntry(value : any) {
		
		const entryID = this.findEntryID(value);
		if (entryID == -1) {
			this.values.push(value);
			this.size++;
			
			return this.size - 1;
		}
		
		return entryID;
	}
	
	findEntryID(value : any) : number {
		for (let i=0; i<this.size; i++) {
			if (this.values[i] == value) { // TODO: This doesn't support complex types (like vectors, or any object)
				return i;
			}
		}
		
		return -1;
	}
}

export class PropertyValueTable {
	propertyIDs: number[];
	valueIDs: number[];
	size: number;
	constructor() {
		this.propertyIDs = [];
		this.valueIDs = [];
		this.size = 0;
	}
	
	registerEntry(propertyID : number, valueID : number) : number {
		
		const entryID = this.findEntryID(propertyID, valueID);
		if (entryID == -1) {
			this.propertyIDs.push(propertyID);
			this.valueIDs.push(valueID);
			this.size++;
			return this.size - 1;
		}
		
		return entryID;
	}
	
	findEntryID(propertyID : number, valueID : number) : number {
		for (let i=0; i<this.size; i++) {
			if (this.propertyIDs[i] == propertyID && this.valueIDs[i] == valueID) {
				return i;
			}
		}
		
		return -1;
	}
}

export class EntityPropertyValueTable {
	propValueIDs: number[];
	entityIDs: number[];
	size: number;
	constructor() {
		this.propValueIDs = [];
		this.entityIDs = [];
		this.size = 0;
	}
	
	registerEntry(propValueID : number, entityID : number) : number {
		
		const entryID = this.findEntryID(propValueID, entityID);
		if (entryID == -1) {
			this.propValueIDs.push(propValueID);
			this.entityIDs.push(entityID);
			this.size++;
			return this.size - 1;
		}
		
		return entryID;
	}
	
	findEntryID(propValueID : number, entityID : number) : number {
		for (let i=0; i<this.size; i++) {
			if (this.propValueIDs[i] == propValueID && this.entityIDs[i] == entityID) {
				return i;
			}
		}
		
		return -1;
	}
}

export class EventDescriptorTable {
	names: string[];
	tags: string[];
	size: number;

	constructor() {
		this.names = [];
		this.tags = [];
		this.size = 0;
	}
	
	registerEntry(name : string, tag : string) : number {
		
		const entryID = this.findEntryID(name, tag);
		if (entryID == -1) {
			this.names.push(name);
			this.tags.push(tag);
			this.size++;
			return this.size - 1;
		}
		
		return entryID;
	}
	
	findEntryID(name : string, tag : string) : number {
		for (let i=0; i<this.size; i++) {
			if (this.names[i] == name && this.tags[i] == tag) {
				return i;
			}
		}
		
		return -1;
	}
}

export class EventTable {
	descriptorIDs: number[];
	propValueIDs: number[];
	entityIDs: number[];
	size: number;

	constructor() {
		this.descriptorIDs = [];
		this.propValueIDs = [];
		this.entityIDs = [];
		this.size = 0;
	}
	
	registerEntry(descriptorID : number, propValueID : number, entityID : number) : number {
		
		const entryID = this.findEntryID(descriptorID, propValueID, entityID);
		if (entryID == -1) {
			this.descriptorIDs.push(descriptorID);
			this.propValueIDs.push(propValueID);
			this.entityIDs.push(entityID);
			this.size++;
			return this.size - 1;
		}
		
		return entryID;
	}
	
	findEntryID(descriptorID : number, propValueID : number, entityID : number) : number {
		for (let i=0; i<this.size; i++) {
			if (this.descriptorIDs[i] == descriptorID && this.propValueIDs[i] == propValueID && this.entityIDs[i] == entityID) {
				return i;
			}
		}
		
		return -1;
	}
}

export class FrameTable {
	entryIDs: any[];
	size: number;
	constructor() {
		this.entryIDs = []; // Array of arrays
		this.size = 0;
	}
	
	registerEntry(entryID : number, frame : number) : number {
		if (!this.entryIDs[frame])
		{
			this.entryIDs[frame] = [];
		}
		
		this.entryIDs[frame].push(entryID);
		this.size++;
		
		return this.size;
	}
}

export interface ClientData
{
	tag: string;
}

export interface IRecordedData {
	type: RecordingFileType;
}

export interface INaiveRecordedData extends IRecordedData {
	version: number;
	frameData: IFrameData[];
	layers: string[];
	clientIds: Map<number, ClientData>
}

export class NaiveRecordedData implements INaiveRecordedData {
	readonly version: number = 1;
	readonly type: RecordingFileType = RecordingFileType.NaiveRecording;
	frameData: IFrameData[];
	layers: string[];
	clientIds: Map<number, ClientData>;
	navMeshTriangles: INavMeshTriangle[];

	constructor() {
		this.frameData = [];
		this.layers = [];
		this.clientIds = new Map<number, ClientData>();
		this.navMeshTriangles = [];
	}

	static getEntityName(entity: IEntity) : string
	{
		// Name is always part of the special groups
		return (entity.properties[1] as IPropertyGroup).value[0].value as string;
	}

	static getEntityPosition(entity: IEntity) : IVec3
	{
		// Position is always part of the special groups
		return (entity.properties[1] as IPropertyGroup).value[1].value as IVec3;
	}

	loadFromData(dataJson: INaiveRecordedData)
	{
		this.frameData = dataJson.frameData;
		this.layers = dataJson.layers;
		if (this.layers == undefined)
		{
			this.layers = [];
		}

		for (let frame of this.frameData)
		{
			this.updateLayersOfFrame(frame);
			this.updateClientIDsOfFrame(frame);

			// Fix legacy frames (just for testing)
			if (frame.clientId == null) { frame.clientId = 0; }
			if (frame.tag == null) { frame.tag = "Client"; }
		}

		console.log(this);
	}

	clear()
	{
		this.frameData.length = 0;
		this.layers.length = 0;
		this.navMeshTriangles.length = 0;
		this.clientIds.clear();
	}

	pushFrame(frame: IFrameData)
	{
		Utils.insertSorted(this.frameData, frame, (value, frameData) => {
			return value.serverTime > frameData.serverTime;
		});

		this.updateLayersOfFrame(frame);
		this.updateClientIDsOfFrame(frame);
	}

	addNavMeshTriangles(navmeshTriangles: INavMeshTriangle[])
	{
		this.navMeshTriangles.push(...navmeshTriangles);
	}

	static findPropertyIdInProperties(frameData: IFrameData, propertyId: number) : IProperty
	{
		let result: IProperty = null;
		for (let entityID in frameData.entities)
		{
			const entity = frameData.entities[entityID];

			NaiveRecordedData.visitEntityProperties(entity, (property) => {
				if (property.id == propertyId)
				{
					result = property;
					return VisitorResult.Stop;
				}
			});

			if (result != null) {
				return result;
			}
		}

		return null;
	}

	static findPropertyIdInEvents(frameData: IFrameData, propertyId: number)
	{
		let resultProp: IProperty = null;
		let resultEvent: IEvent = null;
		for (let entityID in frameData.entities)
		{
			const entity = frameData.entities[entityID];

			NaiveRecordedData.visitEvents(entity.events, (event) => {
				NaiveRecordedData.visitProperties([event.properties], (property) => {
					if (property.id == propertyId)
					{
						resultEvent = event;
						resultProp = property;
						return VisitorResult.Stop;
					}
				});
			});

			if (resultEvent != null) {
				return { resultEvent, resultProp };
			}
		}

		return null;
	}

	static visitEntityProperties(entity: IEntity, callback: IPropertyVisitorCallback)
	{
		NaiveRecordedData.visitProperties(entity.properties, callback);
	}

	static visitProperties(properties: IProperty[], callback: IPropertyVisitorCallback, visitChildGroups: boolean = true)
	{
		const propertyCount = properties.length;
		for (let i=0; i<propertyCount; ++i)
		{
			if (properties[i].type == 'group')
			{
				const res = callback(properties[i]);
				if (res == VisitorResult.Stop) { return; }
				if (visitChildGroups)
				{
					NaiveRecordedData.visitProperties((properties[i] as IPropertyGroup).value, callback);
				}
			}
			else
			{
				const res = callback(properties[i]);
				if (res == VisitorResult.Stop) { return; }
			}
		}
	}

	static visitEvents(events: IEvent[], callback: IEventVisitorCallback)
	{
		const eventCount = events.length;
		for (let i=0; i<eventCount; ++i)
		{
			const res = callback(events[i]);
			if (res == VisitorResult.Stop) { return; }
		}
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
			NaiveRecordedData.visitProperties(mergedFrameData.entities[id].properties, (property: IProperty) => {
				property.id = propId++;
			});
			NaiveRecordedData.visitEvents(mergedFrameData.entities[id].events, (event: IEvent) => {
				event.id = eventId++;

				NaiveRecordedData.visitProperties([event.properties], (property: IProperty) => {
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

	addTestData(frames: number, entityAmount: number) {
		for (let i=0; i<frames; ++i)
		{
			let frameData : IFrameData = { entities: {}, frameId: i, elapsedTime: 0.0166, clientId: 0, serverTime: i, tag: "", coordSystem: ECoordinateSystem.LeftHand };
			
			for (let j=0; j<entityAmount; ++j)
			{
				const entityID = j + 1;

				var entity : IEntity = { id: entityID, parentId: 0, properties: [], events: [] };
				
				var propertyGroup = { type: CorePropertyTypes.Group, name: "properties", value: [
					{ type: CorePropertyTypes.Number, name: "Target ID", value: 122 },
					{ type: CorePropertyTypes.String, name: "Target Name", value: "Player" },
					{ type: CorePropertyTypes.Number, name: "Target Distance", value: j },
					{ type: CorePropertyTypes.Group, name: "Target Info", value: [
						{ type: CorePropertyTypes.Number, name: "Target Radius", value: i },
						{ type: CorePropertyTypes.Number, name: "Target Length", value: Math.random() * 20 }
						] }
					]
				};

				var specialGroup = { type: CorePropertyTypes.Group, name: "special", value: [
					{ type: CorePropertyTypes.String, name: "Name", value: "My Entity Name " + entityID },
					{ type: CorePropertyTypes.Vec3, name: "Position", value: { x: Math.random() * 10, y: Math.random() * 10, z: Math.random() * 10} }
					]
				};

				if (i % 2 == 0)
				{
					var eventProperties = [
						{ name: "Test string", type: CorePropertyTypes.String, value: "eventProp" + i },
						{ name: "Test number", type: CorePropertyTypes.Number, value: j }
					];
					var event = {
						idx: 0,
						name: "OnTestEvent",
						tag: "FirstTest",
						properties: {value: eventProperties, type: CorePropertyTypes.Group, name: "properties" }
					};
					entity.events.push(event);
				}
				else
				{
					var eventProperties2 = [
						{ name: "Test other string", type: CorePropertyTypes.String, value: "eventProp" + i },
						{ name: "Test other number", type: CorePropertyTypes.Number, value: j }
					];
					var event2 = {
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
		if (!this.clientIds.has(frame.clientId))
		{
			this.clientIds.set(frame.clientId, { tag: frame.tag });
		}
	}

	private updateLayersOfFrame(frame: IFrameData) {
		// TODO: Optimize this. Decide how to handle layers, should it be responsability of the sender to group them?
		let layerMap: Map<string, boolean> = new Map<string, boolean>();

		for (let id in frame.entities) {
			let visitor = (property: IProperty) => {
				const layer: string = (property as any).layer;
				if (layer != undefined) {
					layerMap.set(layer, true);
				}
			};
			NaiveRecordedData.visitProperties(frame.entities[id].properties, visitor);
			NaiveRecordedData.visitEvents(frame.entities[id].events, (event: IEvent) => {
				NaiveRecordedData.visitProperties([event.properties], visitor);
			});
		}

		for (let layer of layerMap) {
			this.addLayer(layer[0]);
		}
	}

	private addLayer(name: string) {
		// TODO: Optimize this
		if (!this.layers.includes(name)) {
			this.layers.push(name);
		}
	}
}

export class RecordedData {
	propertyTable: PropertyTable;
	valueTable: ValueTable;
	propertyValueTable: PropertyValueTable;
	entityPropertyValueTable: EntityPropertyValueTable;
	frameTable: FrameTable;
	eventDescrTable: EventDescriptorTable;
	eventTable: EventTable;

	constructor() {
		this.propertyTable = new PropertyTable();
		this.valueTable = new ValueTable();
		this.propertyValueTable = new PropertyValueTable();
		this.entityPropertyValueTable = new EntityPropertyValueTable();
		this.frameTable = new FrameTable();
		this.eventTable = new EventTable();
		this.eventDescrTable = new EventDescriptorTable();
	}

	addProperties(frame: number, entity : IEntity) {
		for (let i=0; i<entity.properties.length; ++i) {
			this.addProperty(frame, entity.id, entity.properties[i], -1);
		}
	}

	addEvents(frame : number, entityID : number, eventData : any) {

	}

	getSize()
	{
		this.frameTable.entryIDs.length;
	}
	
	addProperty(frame : number, entityID : number, propertyData : IProperty, parentID : number) {
		const propertyID = this.propertyTable.registerEntry(propertyData.type, propertyData.name, parentID);
		
		// Register children if it's a group
		if (propertyData.type == CorePropertyTypes.Group) {
			let propertyGroup = propertyData as IPropertyGroup;
			for (let i=0; i<propertyGroup.value.length; i++) {
				this.addProperty(frame, entityID, propertyGroup.value[i], propertyID);
			}
		}
		else {
			const valueID = this.valueTable.registerEntry(propertyData.value);
			
			// Register the property-value entry
			const propValID = this.propertyValueTable.registerEntry(propertyID, valueID);
			
			// Register the entity-property-value entry
			const entityPropValID = this.entityPropertyValueTable.registerEntry(propValID, entityID);
			
			// Register the frame
			this.frameTable.registerEntry(entityPropValID, frame);
			
			//console.log(`Adding property: propertyID ${propertyID}, valueID ${valueID}, entityID: ${entityID}`);
		}
	}
	
	buildFrameData(frame : number) : IFrameData {
		let frameData : IFrameData = { entities: {}, frameId: 0, elapsedTime: 0, clientId: 0, serverTime: 0, tag: "", coordSystem: ECoordinateSystem.LeftHand };
		let tempPropertyData : IProperty = { type: null, value: null, name: null};
		
		const entityPropValIDs =  this.frameTable.entryIDs[frame];
		
		for (let i=0; i<entityPropValIDs.length; i++) {
			const entityPropValID = entityPropValIDs[i];
			const currentEntityID = this.entityPropertyValueTable.entityIDs[entityPropValID];
			
			let entityData = frameData.entities[currentEntityID];
			
			if (!entityData)
			{
				frameData.entities[currentEntityID] = { id: 35, parentId: 0, properties: [], events:[], groupMap: {} };
				entityData = frameData.entities[currentEntityID];
			}
			
			const propValueID = this.entityPropertyValueTable.propValueIDs[entityPropValID];
			
			const valueID = this.propertyValueTable.valueIDs[propValueID];
			const propertyID = this.propertyValueTable.propertyIDs[entityPropValID];
			
			const value = this.valueTable.values[valueID];
			const propertyName = this.propertyTable.names[propertyID];
			const propertyType = this.propertyTable.types[propertyID];
			
			const propertyParent = this.propertyTable.parentIDs[propertyID];
			
			// Create property object
			const property : IProperty = { type: propertyType, name: propertyName, value: value };
			
			tempPropertyData = property;
			
			// We need to add all the parents first
			let currentParentID = propertyParent;
			while (true) {
				
				if (currentParentID == -1) {
					entityData.properties.push(tempPropertyData as IPropertyGroup);
					break;
				}
				
				if (entityData.groupMap[currentParentID]) {
					entityData.groupMap[currentParentID].value.push(tempPropertyData);
					break;
				}
				else {
					const parentName = this.propertyTable.names[currentParentID];
					tempPropertyData = { type: CorePropertyTypes.Group, name: parentName, value: [tempPropertyData] };
					
					entityData.groupMap[currentParentID] = tempPropertyData;
				}
				
				currentParentID = this.propertyTable.parentIDs[currentParentID];
			}
		}
		
		return frameData;
	}

	addTestData() {
		for (let i=0; i<100; ++i)
		{
			const frame = i;
			
			for (let j=0; j<15; ++j)
			{
				const entityID = j + 1;

				var entity : IEntity = { id: entityID, parentId: 0, properties: [], events: [] };
				
				var propertyGroup = { type: "group", name: "properties", value: [
					{ type: "int", name: "Target ID", value: 122 },
					{ type: "string", name: "Target Name", value: "Player" },
					{ type: "float", name: "Target Distance", value: Math.random() * 352 },
					{ type: "group", name: "Target Info", value: [
						{ type: "float", name: "Target Radius", value: Math.random() * 5 },
						{ type: "float", name: "Target Length", value: Math.random() * 20 }
						] }
					]
				};

				var specialGroup = { type: "group", name: "special", value: [
					{ type: "string", name: "Name", value: "My Entity Name " + entityID },
					{ type: "vec3", name: "Position", value: "1, 2, 4" }
					]
				};

				entity.properties.push(propertyGroup);
				entity.properties.push(specialGroup);

				this.addProperties(frame, entity);
			}
		}
	}
}
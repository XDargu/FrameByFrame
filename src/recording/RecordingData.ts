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

export function RecordingFileTypeToString(type: RecordingFileType)
{
	switch(type)
	{
		case RecordingFileType.NaiveRecording: return "Standard";
		case RecordingFileType.RawFrames: return "RawData";
	}
	return "Unknown";
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
        property.type == Type.Mesh ||
		property.type == Type.Path ||
		property.type == Type.Triangle;
}

export function isPropertyTextured(property: IProperty)
{
    const Type = CorePropertyTypes;
    return property.type == Type.Sphere || 
        property.type == Type.Plane ||
        property.type == Type.AABB ||
        property.type == Type.OOBB ||
        property.type == Type.Capsule ||
        property.type == Type.Mesh ||
		property.type == Type.Triangle;
}

export interface IVec2 {
	x: number;
	y: number;
}

export interface IVec3 {
	x: number;
	y: number;
	z: number;
}

export interface IQuat
{
	x: number;
	y: number;
	z: number;
	w: number;
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

export interface IEntityRef {
	name: string;
	id: number;
}

export type TableRow = string[]
export interface IPropertyTable
{
    header: string[];
    rows: TableRow[];
}

export enum EPropertyFlags
{
	None = 0,
	Hidden = 1 << 0,
	Collapsed = 1 << 1,
}

export interface IProperty {
	type: string;
	name?: string;
	value: string | number | boolean | IVec2 | IVec3 | IPropertyCustomType | IEntityRef | IPropertyTable | IProperty[];
	id?: number;
	flags?: EPropertyFlags;
}

export interface IProperyShape extends IProperty {
	layer: string;
	color: IColor;
}

export interface IPropertySphere extends IProperyShape {
	position: IVec3;
	radius: number;
	value: string;
	texture?: string;
}

export interface IPropertyCapsule extends IProperyShape {
	position: IVec3;
	direction: IVec3;
	radius: number;
	height: number;
	value: string;
    texture?: string;
}

export interface IPropertyAABB extends IProperyShape {
	position: IVec3;
	size: IVec3;
	value: string;
    texture?: string;
}

export interface IPropertyOOBB extends IProperyShape {
	position: IVec3;
	size: IVec3;
	up: IVec3;
	forward: IVec3;
	value: string;
    texture?: string;
}

export interface IPropertyPlane extends IProperyShape {
	position: IVec3;
	normal: IVec3;
	up: IVec3;
	width: number;
	length: number;
	value: string;
    texture?: string;
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
    texture?: string;
}

export interface IPropertyPath extends IProperyShape {
	points: IVec3[];
	value: string;
}

export interface IPropertyTriangle extends IProperyShape {
	p1: IVec3;
	p2: IVec3;
	p3: IVec3;
	value: string;
    texture?: string;
}

export type IPropertyTextured = IPropertySphere | IPropertyAABB | IPropertyOOBB | IPropertyCapsule | IPropertyMesh | IPropertyTriangle;

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

export interface IFrameData {
	entities: IFrameEntityData;
	serverTime: number;
	clientId: number;
	frameId: number;
	elapsedTime: number;
	scene: string;
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

export interface IShapeVisitorCallback
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
	scene: "",
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

export interface IResource {
    path: string;
    data: Blob;
    textData: string;
    type: string;
    url: string;
}

export interface IResourcesData {
	[key:string]: IResource;
}

export enum ECommentType
{
    Timeline = 0,
    Property,
    EventProperty
}

export interface IComment {
    id: number;
    type: ECommentType;
    text: string;
    pos: IVec2;
    color?: string;
}

export interface IPropertyComment extends IComment {
    frameId: number;
    entityId: number;
    propertyId: number;
}

export interface ITimelineComment extends IComment {
    frameId: number;
}

export interface IComments {
    [key:number]: IPropertyComment | ITimelineComment;
}

export interface INaiveRecordedData extends IRecordedData {
	version: number;
	storageVersion: number; // Version of the data file before patching
	frameData: IFrameData[];
	layers: string[];
	scenes: string[];
	clientIds: Map<number, ClientData>;
    resources: IResourcesData;
    comments: IComments;
}

export class NaiveRecordedData implements INaiveRecordedData {
	readonly version: number = 4;
	readonly type: RecordingFileType = RecordingFileType.NaiveRecording;
	static readonly UserProps = 0;
	static readonly SpecialProps = 1;
	frameData: IFrameData[];
	layers: string[];
	scenes: string[];
	clientIds: Map<number, ClientData>
	resources: IResourcesData;
    comments: IComments;
	storageVersion: number;

	constructor() {
		this.frameData = [];
		this.layers = [];
		this.scenes = [];
		this.clientIds = new Map<number, ClientData>();
		this.resources = {};
		this.comments = {};
		this.storageVersion = this.version;
	}

    findResource(path: string) : IResource
    {
        return this.resources[path];
    }

    static getSpecialProperties(entity: IEntity) : IPropertyGroup
    {
        return (entity.properties[NaiveRecordedData.SpecialProps] as IPropertyGroup);
    }

	static getEntityName(entity: IEntity) : string
	{
		// Name is always part of the special groups
		return (entity.properties[NaiveRecordedData.SpecialProps] as IPropertyGroup).value[0].value as string;
	}

	static getEntityPosition(entity: IEntity) : IVec3
	{
		// Position is always part of the special groups
		return (entity.properties[NaiveRecordedData.SpecialProps] as IPropertyGroup).value[1].value as IVec3;
	}

	static getEntityUserProperties(entity: IEntity) : IPropertyGroup
	{
		return (entity.properties[NaiveRecordedData.UserProps] as IPropertyGroup);
	}

	static getEntityUp(entity: IEntity) : IVec3
	{
		// Up vector is always part of the special groups
		return (entity.properties[NaiveRecordedData.SpecialProps] as IPropertyGroup).value[2].value as IVec3;
	}

	static getEntityForward(entity: IEntity) : IVec3
	{
		// Forward vector is always part of the special groups
		return (entity.properties[NaiveRecordedData.SpecialProps] as IPropertyGroup).value[3].value as IVec3;
	}

	loadFromData(dataJson: INaiveRecordedData)
	{
		this.frameData = dataJson.frameData;
		this.layers = dataJson.layers;
		this.scenes = dataJson.scenes;
		this.storageVersion = dataJson.storageVersion != undefined ? dataJson.storageVersion : dataJson.version;
        this.resources = dataJson.resources;
        this.comments = dataJson.comments;

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
            this.patchVersion3();
		}

		if (version == 2)
		{
			this.patchVersion2();
            this.patchVersion3();
		}

        if (version == 3)
        {
            this.patchVersion3();
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

    private patchVersion3()
	{
		// Converts from version 3 to version 4
		if (this.resources == undefined)
		{
			this.resources = {};
		}

        if (this.comments == undefined)
        {
            this.comments = {};
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

	static findPropertyIdInEntityProperties(entity: IEntity, propertyId: number) : IProperty
	{
		let result: IProperty = null;
		NaiveRecordedData.visitEntityProperties(entity, (property) => {
			if (property.id == propertyId)
			{
				result = property;
				return VisitorResult.Stop;
			}
		});
		return result;
	}

	static findPropertyIdInEntityEvents(entity: IEntity, propertyId: number)
	{
		let resultProp: IProperty = null;
		let resultEvent: IEvent = null;

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

		return null;
	}

	static findPropertyIdInEntity(entity: IEntity, propertyId: number) : IProperty
	{
		const resultProps = NaiveRecordedData.findPropertyIdInEntityProperties(entity, propertyId);
		if (resultProps)
		{
			return resultProps;
		}

		const resultEvent = NaiveRecordedData.findPropertyIdInEntityEvents(entity, propertyId);
		if (resultEvent)
		{
			return resultEvent.resultProp;
		}

		return null;
	}

	static findPropertyIdInProperties(frameData: IFrameData, propertyId: number) : IProperty
	{
		for (let entityID in frameData.entities)
		{
			const entity = frameData.entities[entityID];
			const result = NaiveRecordedData.findPropertyIdInEntityProperties(entity, propertyId);

			if (result != null) {
				return result;
			}
		}

		return null;
	}

	static findPropertyIdInEvents(frameData: IFrameData, propertyId: number)
	{
		for (let entityID in frameData.entities)
		{
			const entity = frameData.entities[entityID];
			const resultEvent = NaiveRecordedData.findPropertyIdInEntityEvents(entity, propertyId);

			if (resultEvent != null) {
				return resultEvent;
			}
		}

		return null;
	}

    static findPropertyPathInEntity(entity: IEntity, propertyPath: string[]) : IProperty
    {
        const resultProps = NaiveRecordedData.findPropertyPathInProperties(entity.properties, propertyPath);
		if (resultProps)
		{
			return resultProps;
		}

        return null;
    }

    static findPropertyPathInProperties(properties: IProperty[], propertyPath: string[]) : IProperty
    {
        const propertyCount = properties.length;
		for (let i=0; i<propertyCount; ++i)
		{
            const sameName = properties[i].name == propertyPath[0];

            if (propertyPath.length == 1 && sameName)
            {
                return properties[i];
            }

			if (properties[i].type == 'group')
			{
                if (propertyPath.length > 1 && sameName)
                {
                    const prop = NaiveRecordedData.findPropertyPathInProperties((properties[i] as IPropertyGroup).value, propertyPath.slice(1));
                    if (prop != null)
                    {
                        return prop;
                    }
                }
            }
        }

        return null;
    }

    static getEntityPropertyPath(entity: IEntity, propertyId: number) : string[]
    {
        return NaiveRecordedData.getPropertyPath(entity.properties, propertyId);
    }

    static getPropertyPath(properties: IProperty[], propertyId: number) : string[]
    {
        const propertyCount = properties.length;
		for (let i=0; i<propertyCount; ++i)
		{
            if (properties[i].id == propertyId)
            {
                return [properties[i].name];
            }

			if (properties[i].type == 'group')
			{
                const result = NaiveRecordedData.getPropertyPath((properties[i] as IPropertyGroup).value, propertyId);
                if (result != null)
                {
                    return [properties[i].name].concat(result);
                }
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

    static findGroupOfProperty(entity: IEntity, property: IProperty) : IPropertyGroup
	{
        const properties = NaiveRecordedData.getEntityUserProperties(entity).value;
        
		const propertyCount = properties.length;
		for (let i=0; i<propertyCount; ++i)
		{
			if (properties[i].type == 'group')
			{
                if (properties[i].id == property.id)
                {
                    return properties[i] as IPropertyGroup;
                }

                let found = false;

                NaiveRecordedData.visitProperties((properties[i] as IPropertyGroup).value, (prop) => {
                    if (property.id == prop.id)
                    {
                        found = true;
                        return VisitorResult.Stop;
                    }
                });

                if (found)
                    return properties[i] as IPropertyGroup;
            }
			else
			{
				// Uncategorized property
			}
		}

        return null;
	}

    static isEntitySpecialProperty(entity: IEntity, property: IProperty)
    {
        const specialProps = this.getSpecialProperties(entity);
        if (specialProps.id == property.id)
            return true;

        const propertyCount = specialProps.value.length;
		for (let i=0; i<propertyCount; ++i)
		{
            if (specialProps.value[i].id == property.id)
                return true;
        }

        return false;
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
						{ name: "Test number", type: CorePropertyTypes.Number, value: j },
						{ name: "Test boolean", type: CorePropertyTypes.Bool, value: j % 2 == 0 },
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
                                url: null,
                            };
                        }
                    }
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
		let frameData : IFrameData = { entities: {}, frameId: 0, elapsedTime: 0, clientId: 0, serverTime: 0, tag: "", scene: "", coordSystem: ECoordinateSystem.LeftHand };
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
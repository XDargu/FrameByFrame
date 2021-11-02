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
	name: string;
	value: string | number | IVec3 | IPropertyCustomType | IProperty[];
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
	id?: number;
}

export interface IEntity {
	id: number;
	groupMap?: any;
	properties: IPropertyGroup[];
	events: IEvent[];
}

export interface IFrameEntityData {
	[key:number]: IEntity;
}

export interface IFrameData {
	entities: IFrameEntityData;
	frameId: number;
	elapsedTime: number;
	tag: string;
}

export interface IPropertyVisitorCallback
{
    (id: IProperty) : void
}

export interface IEventVisitorCallback
{
    (id: IEvent) : void
}

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

export class NaiveRecordedData {
	frameData: IFrameData[];
	layers: string[];

	constructor() {
		this.frameData = [];
		this.layers = [];
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

	loadFromString(data: string)
	{
		this.frameData = JSON.parse(data).frameData;
		this.layers = JSON.parse(data).layers;
		if (this.layers == undefined)
		{
			this.layers = [];
		}

		for (let frame of this.frameData)
		{
			this.updateLayersOfFrame(frame);
		}

		console.log(this);
	}

	clear()
	{
		this.frameData = [];
		this.layers = [];
	}

	pushFrame(frame: IFrameData)
	{
		this.frameData.push(frame);

		this.updateLayersOfFrame(frame);
	}

	visitEntityProperties(entity: IEntity, callback: IPropertyVisitorCallback)
	{
		this.visitProperties(entity.properties, callback);
	}

	visitProperties(properties: IProperty[], callback: IPropertyVisitorCallback)
	{
		const propertyCount = properties.length;
		for (let i=0; i<propertyCount; ++i)
		{
			if (properties[i].type == 'group')
			{
				callback(properties[i]);
				this.visitProperties((properties[i] as IPropertyGroup).value, callback);
			}
			else
			{
				callback(properties[i]);
			}
		}
	}

	visitEvents(events: IEvent[], callback: IEventVisitorCallback)
	{
		const eventCount = events.length;
		for (let i=0; i<eventCount; ++i)
		{
			callback(events[i]);
		}
	}

	buildFrameData(frame : number) : IFrameData {
		// Instead of building the frame data here we just set the propertyID (overriding previous ones)
		let frameData = this.frameData[frame];

		if (!frameData)
		{
			return { entities: [],
				frameId: 0,
				elapsedTime: 0,
				tag: ""
			};
		}

		let eventId = 1;
		let propId = 1;
		
		for (let id in frameData.entities)
		{
			this.visitProperties(frameData.entities[id].properties, (property: IProperty) => {
				property.id = propId++;
			});
			this.visitEvents(frameData.entities[id].events, (event: IEvent) => {
				event.id = eventId++;

				this.visitProperties([event.properties], (property: IProperty) => {
					property.id = propId++;
				});
			});
		}
		

		return frameData;
	}

	getSize()
	{
		return this.frameData.length;
	}

	addTestData() {
		for (let i=0; i<100; ++i)
		{
			let frameData : IFrameData = { entities: {}, frameId: i, elapsedTime: 0.0166, tag: "" };
			
			for (let j=0; j<15; ++j)
			{
				const entityID = j + 1;

				var entity : IEntity = { id: entityID, properties: [], events: [] };
				
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
					{ type: "vec3", name: "Position", value: { x: Math.random() * 10, y: Math.random() * 10, z: Math.random() * 10} }
					]
				};

				entity.properties.push(propertyGroup);
				entity.properties.push(specialGroup);

				frameData.entities[entity.id] = entity;
			}

			this.pushFrame(frameData);
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
			this.visitProperties(frame.entities[id].properties, visitor);
			this.visitEvents(frame.entities[id].events, (event: IEvent) => {
				this.visitProperties([event.properties], visitor);
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
	
	/* Property Data format:
	 { type: "int", name: "Target ID", value: 122 }
	 If it's a group:
	 { type: "group", name: "Target ID", value: [
		 { type: "int", name: "Target ID", value: 122 }
		]
	 }
	 Property data is always a group type, the base one. Its name is root:
	 { type: "group", name: "root", value: [...] }
	 */
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
		if (propertyData.type == "group") {
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
		let frameData : IFrameData = { entities: {}, frameId: 0, elapsedTime: 0, tag: "" };
		let tempPropertyData : IProperty = { type: null, value: null, name: null};
		
		const entityPropValIDs =  this.frameTable.entryIDs[frame];
		
		for (let i=0; i<entityPropValIDs.length; i++) {
			const entityPropValID = entityPropValIDs[i];
			const currentEntityID = this.entityPropertyValueTable.entityIDs[entityPropValID];
			
			let entityData = frameData.entities[currentEntityID];
			
			if (!entityData)
			{
				frameData.entities[currentEntityID] = { id: 35, properties: [], events:[], groupMap: {} };
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
					tempPropertyData = { type: "group", name: parentName, value: [tempPropertyData] };
					
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

				var entity : IEntity = { id: entityID, properties: [], events: [] };
				
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
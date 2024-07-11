import { CorePropertyTypes } from '../types/typeRegistry';

export namespace Props
{
    export const UserProps = 0;
    export const SpecialProps = 1;
}

export enum ECoordinateSystem
{
    RightHand = 0,
    LeftHand
}

export enum RecordingFileType {
	NaiveRecording,
	RawFrames,

    FileRecording
}

export function RecordingFileTypeToString(type: RecordingFileType)
{
	switch(type)
	{
		case RecordingFileType.NaiveRecording: return "Standard";
		case RecordingFileType.RawFrames: return "RawData";
		case RecordingFileType.FileRecording: return "FileRecording";
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

export enum EPropertyFlags
{
	None = 0,
	Hidden = 1 << 0,
	Collapsed = 1 << 1,
}

export interface IProperty {
	type: string;
	name?: string;
	value: string | number | boolean | IVec2 | IVec3 | IPropertyCustomType | IEntityRef | IProperty[];
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

export const emptyFrameData: IFrameData = {
	entities: [],
	frameId: 0,
	serverTime: 0,
	elapsedTime: 0,
	clientId: 0,
	tag: "",
	scene: "",
	coordSystem: ECoordinateSystem.LeftHand
};

export interface ClientData
{
	tag: string;
}
import * as RECDATA from "../recording/RecordingData";
import * as RECORDING from "../recording/RecordingDefinitions";

export enum MessageType {
	FrameData = 0,
	RecordingOptions,
	RecordingOptionChanged,
	SyncOptionsChanged,
	SyncVisibleShapesData,
	SyncCameraData,
}

export interface IRawRecordingData extends RECDATA.IRecordedData {
	version: number;
	rawFrames: IMessageFrameData[];
}

// Sent by the 3D application to Frame by Frame
// Contains information about an specific frame
export interface IMessageFrameData {
	entities: RECORDING.IEntity[];
	frameId: number;
	clientId: number;
	serverTime: number;
	elapsedTime: number;
	tag: string;
	scene: string;
	coordSystem?: RECORDING.ECoordinateSystem;
}

// Sent by the 3D application to Frame by Frame or the other way around
// Informs about a change in a recording option
export interface IMessageRecordingOption {
	name: string;
	enabled: boolean;
}

// Sent by the 3D application to Frame by Frame or the other way around
// Request to enable or disable sending rendering data to the application
export interface IMessageSyncOptionsChanged {
	syncVisibleShapes: boolean;
	syncCamera: boolean;
}

export interface IRemoteEntityData {
	id: number;
	name: string;
	position: RECORDING.IVec3;
	shapes: RECORDING.IProperyShape[];
}

// Sent by Frame by Frame to the 3D application
// Contains all the visual information so the application can render it
export interface IMessageSyncVisibleShapesData {
	entities: IRemoteEntityData[];
	coordSystem: RECORDING.ECoordinateSystem;
}

// Sent by Frame by Frame to the 3D application
// Contains camera position and orientation
export interface IMessageSyncCameraData {
	position: RECORDING.IVec3;
	up: RECORDING.IVec3;
	forward: RECORDING.IVec3;
}

export interface IMessage {
	type: MessageType,
	data: IMessageFrameData | IMessageRecordingOption[] | IMessageSyncOptionsChanged | IMessageSyncVisibleShapesData
}
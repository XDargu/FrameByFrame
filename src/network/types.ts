import * as RECORDING from '../recording/RecordingData';

export enum MessageType
{
    FrameData = 0,
}

export interface IMessageFrameData {
	entities: RECORDING.IEntity[];
	frameId: number;
	elapsedTime: number;
	tag: string;
}

export interface IMessage {
    type: MessageType,
    data: IMessageFrameData
}
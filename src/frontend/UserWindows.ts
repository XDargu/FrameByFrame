import { ipcRenderer } from "electron";
import * as Messaging from "../messaging/MessageDefinitions";
import { loadResource } from "../resources/resources";
import * as RECORDING from '../recording/RecordingData';

interface UserWindowRequestListener
{
    (id: number, requestId: number) : void
}

let userWindowRequestId = 1;
let pendingRequests: Map<number, UserWindowRequestListener> = new Map<number, UserWindowRequestListener>();

export function onUserWindowOpened(id: number, requestId: number)
{
    const request = pendingRequests.get(requestId);
    if (request)
    {
        request(id, requestId);
        pendingRequests.delete(requestId);
    }
}

function addUserwindowEvent(requestId: number, listener: UserWindowRequestListener)
{
    pendingRequests.set(requestId, listener);
}

export function sendImageData(id: number, content: string)
{
    const request : Messaging.IUpdateWindowsContent = {
        id: id,
        type: Messaging.EUserWindowType.Image,
        content: content
    };
    ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.UpdateWindow, request));
}

export async function requestOpenWindow()
{
    return new Promise<number>((resolve, reject) => {
        const requestId = userWindowRequestId++;

        const request : Messaging.IOpenWindowRequest = {
            type: Messaging.EUserWindowType.Image,
            requestId: requestId
        };
        ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.OpenWindowRequest, request));

        addUserwindowEvent(requestId, (id, requestId) => {
            resolve(id);
        });
    });
}
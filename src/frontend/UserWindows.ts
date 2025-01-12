import { ipcRenderer } from "electron";
import * as Messaging from "../messaging/MessageDefinitions";

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

export function sendImageData(id: number, content: string, title: string)
{
    const request : Messaging.IUpdateWindowsContent = {
        id: id,
        type: Messaging.EUserWindowType.Image,
        content: content,
        title: title,
    };
    ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.UpdateWindow, request));
}

export function sendTextData(id: number, content: string, title: string)
{
    const request : Messaging.IUpdateWindowsContent = {
        id: id,
        type: Messaging.EUserWindowType.Text,
        content: content,
        title: title,
    };
    ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.UpdateWindow, request));
}

export function sendPropertyGroupData(id: number, content: string | Messaging.IPropertyGroupData, title: string)
{
    const request : Messaging.IUpdateWindowsContent = {
        id: id,
        type: Messaging.EUserWindowType.PropertyGroup,
        content: content,
        title: title,
    };
    ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.UpdateWindow, request));
}

export async function requestOpenWindow(title: string)
{
    return new Promise<number>((resolve, reject) => {
        const requestId = userWindowRequestId++;

        const request : Messaging.IOpenWindowRequest = {
            type: Messaging.EUserWindowType.Image,
            requestId: requestId,
            title: title,
        };
        ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.OpenWindowRequest, request));

        addUserwindowEvent(requestId, (id, requestId) => {
            resolve(id);
        });
    });
}
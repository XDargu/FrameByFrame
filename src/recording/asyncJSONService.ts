import { fork } from 'child_process';

const asyncJson = fork(__dirname + '/asyncJSON.js');

interface Message
{
    callerId: number,
    method: string,
    value: any
}

const callers = new Map<number, any>();

asyncJson.on('message', (response) => {
    callers.get(response.callerId).resolve(response.returnValue);
    callers.delete(response.callerId);
});

function callAsyncJson(method : string, value: any)
{
    const callerId = parseInt(Math.random() * 1000000 + 'asyncJson');
    return new Promise((resolve, reject) =>
    {
        callers.set(callerId, { resolve: resolve, reject: reject })

        const message : Message = { callerId: callerId, method: method, value: value };
        asyncJson.send(message);
    });
}

export function JsonStringify(value : any) {
    return callAsyncJson('stringify', value);
}

export function JsonParse(buffer: Buffer) {
    return callAsyncJson('parse', buffer.toString());
}
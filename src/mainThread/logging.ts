import { LogChannel, LogLevel, ILogAction } from "../frontend/ConsoleController";
import { mainWindow } from "../main";
import * as Messaging from "../messaging/MessageDefinitions";

export function createLogMessage(level: LogLevel, channel: LogChannel, ...message: (string | ILogAction)[]) : Messaging.Message
{
    return new Messaging.Message(Messaging.MessageType.LogToConsole,
    {
        message: message,
        level: level,
        channel: channel
    });
}

export function logToConsole(level: LogLevel, channel: LogChannel, ...message: (string | ILogAction)[])
{
    mainWindow.webContents.send('asynchronous-reply', createLogMessage(level, channel, ...message));
};

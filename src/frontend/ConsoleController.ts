export interface IActionCallback
{
    () : void
}

export interface ILogAction
{
    text: string;
    callback: IActionCallback;
    color?: string;
}

export enum LogLevel
{
    Verbose = 0,
    Information,
    Warning,
    Error
}

export enum LogChannel
{
    Default = 0,
    Layers,
    Selection,
    Files,

    Count
}

export class ConsoleWindow
{
    private console: HTMLElement;
    logLevel: LogLevel;
    openChannels: Array<boolean>;

    constructor(console: HTMLElement, logLevel: LogLevel)
    {
        this.console = console;
        this.logLevel = logLevel;
        this.openChannels = new Array<boolean>(LogChannel.Count);
        this.openChannels.fill(true, 0, LogChannel.Count);
    }

    openChannel(channel: LogChannel)
    {
        this.openChannels[channel] = true;
    }

    closeChannel(channel: LogChannel)
    {
        this.openChannels[channel] = false;
    }

    isChannelOpen(channel: LogChannel) : boolean
    {
        return this.openChannels[channel];
    }

    log(logLevel: LogLevel, channel: LogChannel, ...message: (string | ILogAction)[])
    {
        if (logLevel >= this.logLevel && this.isChannelOpen(channel))
        {
            if (logLevel == LogLevel.Error)
            {
                let line = this.addError();
                this.addToLine(line, ...message);
            }
            else
            {
                let line = this.addMessage();
                this.addToLine(line, ...message);
            }
        }
    }

    clear()
    {
        this.console.innerHTML = ``;
    }

    private addToLine(line: HTMLDivElement, ...message: (string | ILogAction)[])
    {
        for (let i = 0; i < message.length; i++)
        {
            const data: any = message[i];

            if (typeof data === 'string')
            {
                let text = document.createTextNode(message[i] as string);
                line.appendChild(text);
            }
            else if (typeof data === 'object')
            {
                let link = document.createElement("span");
                link.classList.add("basico-console-link");
                link.innerText = (message[i] as ILogAction).text;
                link.onclick = (message[i] as ILogAction).callback;
                line.appendChild(link);
            }
        }
    }

    private addMessage()
    {
        return this.addEntry("fa-angle-right");
    }

    private addError()
    {
        return this.addEntry("fa-times-circle", "basico-error");
    }

    private addEntry(icon: string, extraClass: string = null): HTMLDivElement
    {
        let outerWrapper = document.createElement("div");
        outerWrapper.classList.add("basico-console-block");
        if (extraClass)
        {
            outerWrapper.classList.add(extraClass);
        }

        let line = document.createElement("div");
        line.classList.add("basico-console-line");

        let iconElement = document.createElement("i");
        iconElement.classList.add("basico-console-icon", "fas", icon);
        line.appendChild(iconElement);

        outerWrapper.appendChild(line);
        this.console.appendChild(outerWrapper);

        return line;
    }
}
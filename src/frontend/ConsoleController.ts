export interface IActionCallback
{
    () : void
}

export interface ILogCallback
{
    (logLevel: LogLevel, channel: LogChannel, ...message: (string | ILogAction)[]) : void
}

export interface ILogAction
{
    text: string;
    callback: IActionCallback;
    tooltip?: string;
}

export enum LogLevel
{
    Verbose = 0,
    Information,
    Warning,
    Error,

    Count
}

export interface ILogLevelChanged
{
    (logLevel: LogLevel, isEnabled: boolean) : void
}

function levelToString(level: LogLevel) : string
{
    switch(level)
    {
        case LogLevel.Verbose: return "Verbose";
        case LogLevel.Information: return "Information";
        case LogLevel.Warning: return "Warning";
        case LogLevel.Error: return "Error";
    }
}

export enum LogChannel
{
    Default = 0,
    Layers,
    Selection,
    Timeline,
    Files,
    Connections,

    Count
}

export class Console
{
    private static logCallback : ILogCallback = null;

    static log(logLevel: LogLevel, channel: LogChannel, ...message: (string | ILogAction)[])
    {
        Console.logCallback(logLevel, channel, ...message);
    }

    static setCallbacks(logCallback : ILogCallback)
    {
        Console.logCallback = logCallback;
    }
}

class ConsoleLevelDropdown
{
    private dropdown: HTMLElement;
    private console: ConsoleWindow;
    private levelChangedCallback: ILogLevelChanged;

    constructor(dropdown: HTMLElement, console: ConsoleWindow, levelChangedCallback: ILogLevelChanged)
    {
        this.dropdown = dropdown;
        this.console = console;
        this.levelChangedCallback = levelChangedCallback;

        this.createUI();
    }

    private createUI()
    {
        let dropdownContent = this.dropdown.querySelector(".basico-dropdown-content");
        if (dropdownContent)
        {
            dropdownContent.append(
                this.createEntry(LogLevel.Verbose),
                this.createEntry(LogLevel.Information),
                this.createEntry(LogLevel.Warning),
                this.createEntry(LogLevel.Error)
            )
        }
    }

    private createEntry(level: LogLevel) : HTMLElement
    {
        const isActive = this.console.isLevelEnabled(level);

        let entry = document.createElement("a");
        let icon = document.createElement("i");
        icon.classList.add("fa");
        if (isActive)
        {
            icon.classList.add("fa-check");
        }
        let span = document.createElement("span");
        span.textContent = levelToString(level);

        entry.appendChild(icon);
        entry.appendChild(span);

        entry.onclick = () => {
            this.console.toggleLevel(level);
            icon.classList.toggle("fa-check");
            this.levelChangedCallback(level, this.console.isLevelEnabled(level));
        };

        return entry;
    }

}

export class BitArrayHelper
{
    data: Array<boolean>;

    constructor(size: number, defaultValue: boolean = true)
    {
        this.data = new Array<boolean>(size);
        this.data.fill(defaultValue, 0, size);
    }

    setIndex(index: number, value: boolean)
    {
        this.data[index] = value;
    }

    getIndex(index: number) : boolean
    {
        return this.data[index];
    }
}

export class ConsoleWindow
{
    private console: HTMLElement;
    private levelDropdown: ConsoleLevelDropdown;
    private openChannels: BitArrayHelper;
    private openLevels: BitArrayHelper;

    constructor(consoleElement: HTMLElement, logLevel: LogLevel)
    {
        this.console = consoleElement;
        this.openChannels = new BitArrayHelper(LogChannel.Count);
        this.openLevels = new BitArrayHelper(LogLevel.Count, false);
        this.enableLevel(LogLevel.Information);
        this.enableLevel(LogLevel.Warning);
        this.enableLevel(LogLevel.Error);
        this.levelDropdown = new ConsoleLevelDropdown(document.getElementById("console-levels"), this, this.onLogLevelChanged.bind(this) );
    }

    openChannel(channel: LogChannel)
    {
        this.openChannels.setIndex(channel, true);
    }

    closeChannel(channel: LogChannel)
    {
        this.openChannels.setIndex(channel, false);
    }

    isChannelOpen(channel: LogChannel) : boolean
    {
        return this.openChannels.getIndex(channel);
    }

    log(logLevel: LogLevel, channel: LogChannel, ...message: (string | ILogAction)[])
    {
        const isVisible = this.isLevelEnabled(logLevel) && this.isChannelOpen(channel);
        if (isVisible)
        {
            if (logLevel == LogLevel.Error)
            {
                let line = this.addError(logLevel, channel);
                this.addToLine(line, ...message);
            }
            else
            {
                let line = this.addMessage(logLevel, channel);
                this.addToLine(line, ...message);
            }
        }
    }

    clear()
    {
        this.console.innerHTML = ``;
    }

    enableLevel(level: LogLevel)
    {
        this.openLevels.setIndex(level, true);
        if (!this.console.classList.contains(levelToString(level)))
        {
            this.console.classList.add(levelToString(level));
        }
    }

    disableLevel(level: LogLevel)
    {
        this.openLevels.setIndex(level, false);
        this.console.classList.remove(levelToString(level));
    }

    isLevelEnabled(level: LogLevel) : boolean
    {
        return this.openLevels.getIndex(level);
    }

    toggleLevel(level: LogLevel)
    {
        if (this.isLevelEnabled(level))
            this.disableLevel(level);
        else
            this.enableLevel(level);
    }

    private onLogLevelChanged(level: LogLevel, isActive: boolean)
    {
        // Nothing for now
    }

    private addToLine(line: HTMLDivElement,  ...message: (string | ILogAction)[])
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
                const logAction = message[i] as ILogAction;
                let link = document.createElement("span");
                link.classList.add("basico-console-link");
                link.innerText = logAction.text;
                link.onclick = logAction.callback;
                if (logAction.tooltip)
                {
                    link.title = logAction.tooltip;
                }
                line.appendChild(link);
            }
        }
    }

    private addMessage(logLevel: LogLevel, channel: LogChannel)
    {
        return this.addEntry("fa-angle-right", logLevel, channel);
    }

    private addError(logLevel: LogLevel, channel: LogChannel)
    {
        return this.addEntry("fa-times-circle", logLevel, channel, "basico-error");
    }

    private addEntry(icon: string, logLevel: LogLevel, channel: LogChannel, extraClass: string = null): HTMLDivElement
    {
        let outerWrapper = document.createElement("div");
        outerWrapper.classList.add("basico-console-block");
        outerWrapper.classList.add(levelToString(logLevel));
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
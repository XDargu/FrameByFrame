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

export class ConsoleWindow
{
    private console: HTMLElement;

    constructor(console: HTMLElement)
    {
        this.console = console;
    }

    log(...message: (string | ILogAction)[])
    {
        let line = this.addMessage();
        this.addToLine(line, ...message);
    }

    logError(...message: (string | ILogAction)[])
    {
        let line = this.addError();
        this.addToLine(line, ...message);
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
                line.innerText += message[i];
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
        outerWrapper.appendChild(line);

        let iconElement = document.createElement("div");
        iconElement.classList.add("basico-console-icon", "fas", icon);
        line.appendChild(iconElement);

        this.console.appendChild(outerWrapper);

        return line;
    }
}
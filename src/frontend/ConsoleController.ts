export class ConsoleWindow
{
    private console: HTMLElement;

    constructor(console: HTMLElement)
    {
        this.console = console;
    }

    logMessage(message: string)
    {
        const errorElement = `<div class="basico-console-block"><div class="basico-console-line"><i class="basico-console-icon fas fa-angle-right"></i>${message}</div></div>`
        this.console.innerHTML += errorElement;
    }

    logError(message: string)
    {
        const errorElement = `<div class="basico-console-block basico-error"><div class="basico-console-line"><i class="basico-console-icon fas fa-times-circle"></i>${message}</div></div>`
        this.console.innerHTML += errorElement;
    }

    clear()
    {
        this.console.innerHTML = ``;
    }
}
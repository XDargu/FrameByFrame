import { ConnectionsManager, ConnectionId} from '../network/conectionsManager';
import Connection from '../network/simpleClient';
import { Console, LogChannel, LogLevel } from './ConsoleController';

export interface IConnectionButtonCallback
{
    (id: ConnectionId) : void
}

enum Icon
{
    Normal = "fa fa-network-wired",
    Loading = "fa fa-spinner fa-spin"
}

export default class ConnectionButtons
{
    private connectionsManager: ConnectionsManager;
    private buttonMap: Map<ConnectionId, HTMLElement>;
    private buttonGroup: HTMLElement;

    private onButtonPressed: IConnectionButtonCallback;

    constructor(buttonGroup: HTMLElement, onButtonPressed: IConnectionButtonCallback)
    {
        this.buttonMap = new Map<ConnectionId, HTMLElement>();
        this.buttonGroup = buttonGroup;
        this.onButtonPressed = onButtonPressed;
    }

    onConnectionCreated(id: ConnectionId)
    {
        // Add new button
        Console.log(LogLevel.Verbose, LogChannel.Connections, "Button connection created");
        let button = ConnectionButtons.createButton(id, this.onButtonPressed.bind(this));
        console.log(this);
        this.buttonGroup.appendChild(button);
        this.buttonMap.set(id, button);
    }

    onConnectionRemoved(id: ConnectionId)
    {
        let button = this.buttonMap.get(id);
        button.remove();
        this.buttonMap.delete(id);
    }

    onConnectionConnected(id: ConnectionId)
    {
        let button = this.buttonMap.get(id);
        ConnectionButtons.setButtonConnected(button);
        ConnectionButtons.setButtonIcon(button, Icon.Normal);
    }

    onConnectionDisconnected(id: ConnectionId)
    {
        let button = this.buttonMap.get(id);
        ConnectionButtons.setButtonDisconnected(button);
        ConnectionButtons.setButtonIcon(button, Icon.Normal);
    }

    onConnectionConnecting(id: ConnectionId)
    {
        let button = this.buttonMap.get(id);
        ConnectionButtons.setButtonIcon(button, Icon.Loading);
    }

    onConnectionDisconnecting(id: ConnectionId)
    {
        let button = this.buttonMap.get(id);
        ConnectionButtons.setButtonIcon(button, Icon.Loading);
    }

    private static setButtonIcon(button: HTMLElement, iconType: Icon)
    {
        let icon = button.querySelector("i");
        icon.className = iconType;
    }

    private static createButton(id: ConnectionId, callback: IConnectionButtonCallback) : HTMLElement
    {
        let button = document.createElement("button");
        button.classList.add("basico-button");
        button.classList.add("connection-button-disabled");

        let icon = document.createElement("i");
        icon.classList.add("fas");
        icon.classList.add("fa-network-wired");
        button.appendChild(icon);

        button.onclick = () => { 
            callback(id);
        }

        return button;
    }

    private static setButtonConnected(button: HTMLElement)
    {
        button.classList.remove("connection-button-disabled");
    }

    private static setButtonDisconnected(button: HTMLElement)
    {
        if (!button.classList.contains("connection-button-disabled"))
            button.classList.add("connection-button-disabled");
    }

    private static setButtonId(button: HTMLElement, id: number)
    {

    }
}
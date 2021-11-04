import { ConnectionId, ConnectionsManager } from '../network/conectionsManager';
import Connection from '../network/simpleClient';
import { Console, LogChannel, LogLevel } from './ConsoleController';

export interface IMessageCallback
{
    (data: string) : void
}

export interface IConnectonCallback
{
    (id: ConnectionId) : void
}

export interface ConnectionListener
{
    onConnectionAdded: IConnectonCallback;
    onConnectionRemoved: IConnectonCallback;
    onConnectionConnected: IConnectonCallback;
    onConnectionDisconnected: IConnectonCallback;
    onConnectionConnecting:  IConnectonCallback;
    onConnectionDisconnecting:  IConnectonCallback;
}

interface ConnectionCardData
{
    connectionElement: HTMLElement;
    connectionStatus: HTMLElement;
    card: HTMLElement;
    connectButton: HTMLElement;
    removeButton: HTMLElement;
}

export type ListenerId = number;

export default class ConnectionsList
{
    private connectionsManager: ConnectionsManager;
    private connectionsMap: Map<ConnectionId, HTMLElement>;
    private connectionsList: HTMLElement;
    private listeners: Map<number, ConnectionListener>
    private lastListenerId: ListenerId;
    
    private onMessageCallback: IMessageCallback;

    constructor(connectionsList: HTMLElement, onMessageCallback: IMessageCallback)
    {
        this.connectionsManager = new ConnectionsManager();
        this.connectionsMap = new Map<ConnectionId, HTMLElement>();
        this.connectionsList = connectionsList;
        this.onMessageCallback = onMessageCallback;

        this.listeners = new Map<ListenerId, ConnectionListener>();
        this.lastListenerId = 0;
    }

    addListener(listener: ConnectionListener) : ListenerId
    {
        this.lastListenerId++;
        this.listeners.set(this.lastListenerId, listener);
        return this.lastListenerId;
    }

    removeListener(id: ListenerId)
    {
        this.listeners.delete(id);
    }

    initialize()
    {
        // Connections
        let addConnectionButton: HTMLElement = document.getElementById("addConnectionBtn");
        addConnectionButton.onclick = this.addConnectionCallback.bind(this);
    }

    addConnection(address: string, port: string, shouldAutoConnect: boolean)
    {
        Console.log(LogLevel.Verbose, LogChannel.Connections, `Creating new connection to: ${address}:${port} and trying to connect.`);
        const id: ConnectionId = this.connectionsManager.addConnection(address, port) as any as ConnectionId;

        this.listeners.forEach((value: ConnectionListener) => {
            value.onConnectionAdded(id);
        });

        const elementData = ConnectionsList.createConnectionElement(address, port, id);

        this.connectionsList.appendChild(elementData.connectionElement);
        this.connectionsList.appendChild(elementData.card);

        this.connectionsMap.set(id, elementData.connectionElement);
        
        elementData.connectButton.onclick = () => {
            console.log("Hello");
            this.connectButtonCallback(id);
        };
        elementData.removeButton.onclick = () => {
            this.removeButtonCallback(id);
        };

        let callback = this.onMessageCallback;

        let connection: Connection = this.connectionsManager.getConnection(id as any as number);

        connection.onMessage = (openEvent : MessageEvent) => {
            callback(openEvent.data);
        };
        connection.onConnected = (openEvent : Event) => {
            Console.log(LogLevel.Verbose, LogChannel.Connections, `Connection established to: ${address}:${port}`);
            elementData.connectionStatus.textContent = "Connected";
            elementData.connectButton.textContent = "Disconnect";

            this.listeners.forEach((value: ConnectionListener) => {
                value.onConnectionConnected(id);
            });
        };
        connection.onDisconnected = (closeEvent : CloseEvent) => {
            Console.log(LogLevel.Verbose, LogChannel.Connections, (connection.isConnected() ? "Connection lost" : "Can't connect") + ` to: ${address}:${port}`);
            elementData.connectionStatus.textContent = "Disconnected";
            elementData.connectButton.textContent = "Connect";

            this.listeners.forEach((value: ConnectionListener) => {
                value.onConnectionDisconnected(id);
            });
        };
        connection.onError = (errorEvent : Event) => {
            Console.log(LogLevel.Error, LogChannel.Connections, `Connection error in: ${address}:${port}`);
        };

        if (shouldAutoConnect)
        {
            this.toggleConnection(id);
        }
    }

    sendToAllConnections(message: any)
    {
        const stringMessage = JSON.stringify(message);
        this.connectionsList
        this.connectionsMap.forEach((value: HTMLElement, id: ConnectionId) => {
            let connection = this.connectionsManager.getConnection(id);
            if (connection){
                connection.send(stringMessage)
            }
        });
    }

    toggleConnection(id: ConnectionId)
    {
        this.connectButtonCallback(id);
    }

    private static createConnectionElement(address: string, port: string, id: ConnectionId) : ConnectionCardData
    {
        let connectionElement = document.createElement("div");
        connectionElement.className = "basico-title basico-title-compact";
        connectionElement.id = `connection-${id}`;
        connectionElement.innerText = `${address}:${port}`;

        let card = document.createElement("div");
        card.className = "basico-card";

        let list = document.createElement("div");
        list.className = "basico-list basico-list-compact";
        card.appendChild(list);

        let status = document.createElement("div");
        status.className = "basico-list-item";
        status.innerText = "Status";
        list.appendChild(status);

        let connectionStatus = document.createElement("div");
        connectionStatus.className = "basico-tag";
        connectionStatus.id = `connection-${id}-status`;
        connectionStatus.innerText = "Disconnected";
        status.appendChild(connectionStatus);

        let footer = document.createElement("div");
        footer.className = "basico-card-footer";
        card.appendChild(footer);

        let buttonGroup = document.createElement("div");
        buttonGroup.className = "basico-button-group connection-card-buttons";
        footer.appendChild(buttonGroup);

        let connectButton = document.createElement("div");
        connectButton.className = "basico-button basico-small";
        connectButton.id = `connection-${id}-connect`;
        connectButton.innerText = "Connect";
        buttonGroup.appendChild(connectButton);

        let removeButton = document.createElement("div");
        removeButton.className = "basico-button basico-small";
        removeButton.id = `connection-${id}-remove`;
        removeButton.innerText = "Remove connection";
        buttonGroup.appendChild(removeButton);

        return {
            connectionElement: connectionElement,
            connectionStatus: connectionStatus,
            card: card,
            connectButton: connectButton,
            removeButton: removeButton
        };
    }

    private addConnectionCallback()
    {
        let addressElement: HTMLInputElement = document.getElementById("addConnectionAddress") as HTMLInputElement;
        let portElement: HTMLInputElement = document.getElementById("addConnectionPort") as HTMLInputElement;

        this.addConnection(addressElement.value, portElement.value, true);
    }

    private connectButtonCallback(id: ConnectionId)
    {
        console.log("on click " + id);

        let connectionStatus: HTMLElement = document.getElementById(`connection-${id}-status`);
        let connectButton: HTMLElement = document.getElementById(`connection-${id}-connect`);
        let connection: Connection = this.connectionsManager.getConnection(id as any as number);


        if (connection.isConnected())
        {
            Console.log(LogLevel.Verbose, LogChannel.Connections, `Disconnecting from: ${connection.hostname}:${connection.port}`);
            connection.disconnect();
            connectionStatus.textContent = "Disconnecting...";
            connectButton.textContent = "Connect";

            this.listeners.forEach((value: ConnectionListener) => {
                value.onConnectionDisconnecting(id);
            });
        }
        else
        {
            Console.log(LogLevel.Verbose, LogChannel.Connections, `Connecting to: ${connection.hostname}:${connection.port}`);
            connectionStatus.textContent = "Connecting...";
            connectButton.textContent = "Disconnect";
            connection.connect();

            this.listeners.forEach((value: ConnectionListener) => {
                value.onConnectionConnecting(id);
            });
        }
    }

    private removeButtonCallback(id: ConnectionId)
    {
        let connectionElementTitle: HTMLElement = this.connectionsMap.get(id);
        let connectionElement: HTMLElement = connectionElementTitle.nextElementSibling as HTMLElement;

        this.connectionsList.removeChild(connectionElementTitle);
        this.connectionsList.removeChild(connectionElement);

        this.connectionsManager.removeConnection(<number><unknown>id);
        this.connectionsMap.delete(id);

        this.listeners.forEach((value: ConnectionListener) => {
            value.onConnectionRemoved(id);
        });
    }
}
import ConnectionsManager from '../network/conectionsManager';
import ConnectionId from '../network/conectionsManager';
import Connection from '../network/simpleClient';
import { Console, LogChannel, LogLevel } from './ConsoleController';

export interface IMessageCallback
{
    (data: string) : void
}

export default class ConnectionsList
{
    private connectionsManager: ConnectionsManager;
    private connectionsMap: Map<ConnectionId, HTMLElement>;
    private connectionsList: HTMLElement;
    
    private onMessageCallback: IMessageCallback;

    constructor(connectionsList: HTMLElement, onMessageCallback: IMessageCallback)
    {
        this.connectionsManager = new ConnectionsManager();
        this.connectionsMap = new Map<ConnectionId, HTMLElement>();
        this.connectionsList = connectionsList;
        this.onMessageCallback = onMessageCallback;
    }

    initialize()
    {
        // Connections
        let addConnectionButton: HTMLElement = document.getElementById("addConnectionBtn");
        addConnectionButton.onclick = this.addConnectionCallback.bind(this);
    }

    addConnection(address: string, port: string)
    {
        Console.log(LogLevel.Verbose, LogChannel.Connections, `Creating new connection to: ${address}:${port} and trying to connect.`);

        const id: ConnectionId = this.connectionsManager.addConnection(address, port) as any as ConnectionId;

        // Add new element to list
        let html:string = `<div class="basico-title basico-title-compact" id="connection-${id}">${address}:${port}</div>
                    <div class="basico-card">
                        <div class="basico-list basico-list-compact">
                            <div class="basico-list-item">Status<div class="basico-tag" id="connection-${id}-status">Connecting...</div></div>
                        </div>
                        <div class="basico-card-footer">
                            <div class="basico-button-group">
                                <div class="basico-button basico-small" id="connection-${id}-connect">Disconnect</div>
                                <div class="basico-button basico-small" id="connection-${id}-remove">Remove connection</div>
                            </div>
                        </div>
                    </div>`;

        this.connectionsList.innerHTML += html;

        let connectionElement: HTMLElement = document.getElementById(`connection-${id}`);
        this.connectionsMap.set(id, connectionElement);

        let connectButton: HTMLElement = document.getElementById(`connection-${id}-connect`);
        let removeButton: HTMLElement = document.getElementById(`connection-${id}-remove`);
        let connectionStatus: HTMLElement = document.getElementById(`connection-${id}-status`);
        
        let control = this;
        connectButton.onclick = function() {
            control.connectButtonCallback(id);
        };
        removeButton.onclick = function() {
            control.removeButtonCallback(id);
        };

        let callback = this.onMessageCallback;

        let connection: Connection = this.connectionsManager.getConnection(id as any as number);
        connection.onMessage = function(openEvent : MessageEvent) {
            callback(openEvent.data);
        };
        connection.onConnected = function(openEvent : Event) {
            Console.log(LogLevel.Verbose, LogChannel.Connections, `Connection established to: ${address}:${port}`);
            connectionStatus.textContent = "Connected";
            connectButton.textContent = "Disconnect";
        };
        connection.onDisconnected = function(closeEvent : CloseEvent) {
            Console.log(LogLevel.Verbose, LogChannel.Connections, (connection.isConnected() ? "Connection lost" : "Can't connect") + ` to: ${address}:${port}`);
            connectionStatus.textContent = "Disconnected";
            connectButton.textContent = "Connect";
        };
        connection.onError = function(errorEvent : Event) {
            Console.log(LogLevel.Error, LogChannel.Connections, `Connection error in: ${address}:${port}`);
        };
    }

    private addConnectionCallback()
    {
        let addressElement: HTMLInputElement = document.getElementById("addConnectionAddress") as HTMLInputElement;
        let portElement: HTMLInputElement = document.getElementById("addConnectionPort") as HTMLInputElement;

        this.addConnection(addressElement.value, portElement.value);
    }

    private connectButtonCallback(id: ConnectionId)
    {
        let connectionStatus: HTMLElement = document.getElementById(`connection-${id}-status`);
        let connectButton: HTMLElement = document.getElementById(`connection-${id}-connect`);
        let connection: Connection = this.connectionsManager.getConnection(id as any as number);

        if (connection.isConnected())
        {
            Console.log(LogLevel.Verbose, LogChannel.Connections, `Disconnecting from: ${connection.hostname}:${connection.port}`);
            connection.disconnect();
            connectionStatus.textContent = "Disconnecting...";
            connectButton.textContent = "Connect";
        }
        else
        {
            Console.log(LogLevel.Verbose, LogChannel.Connections, `Connecting to: ${connection.hostname}:${connection.port}`);
            connectionStatus.textContent = "Connecting...";
            connectButton.textContent = "Disconnect";
            connection.connect();
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
    }
}
import Connection from './simpleClient';

export type ConnectionId = number;

export class ConnectionsManager {

    private lastConnectionId : ConnectionId;
    private connections : Map<ConnectionId, Connection>

    constructor()
    {
        this.connections = new Map<ConnectionId, Connection>();
        this.lastConnectionId = 1;
    }

    addConnection(hostName: string, port: string) : ConnectionId
    {
        let connection : Connection = new Connection(hostName, port, 'tcp');
        const id : ConnectionId = this.lastConnectionId++;

        this.connections.set(id, connection);

        return id;
    }

    removeConnection(id : ConnectionId) : boolean
    {
        let connection : Connection = this.connections.get(id);
        if (connection)
        {
            connection.disconnect();
        }

        return this.connections.delete(id);
    }

    getConnection(id : ConnectionId) : Connection
    {
        return this.connections.get(id);
    }
}
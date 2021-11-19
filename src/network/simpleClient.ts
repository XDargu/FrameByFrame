export interface IWebSocketOnOpenCallback
{
	(ev: Event) : any | null;
}

export interface IWebSocketOnCloseCallback
{
	(ev: CloseEvent, causedByUser: boolean) : any | null;
}

export interface IWebSocketOnErrorCallback
{
	(ev: Event) : any | null;
}

export interface IWebSocketOnMessageCallback
{
	(ev: MessageEvent) : any | null;
}
export default class Connection {
    hostname: string;
    port: string;
    protocol: string;
	webSocket: WebSocket;
	lastDisconnectionCausedByUser: boolean;
	
    onMessage: IWebSocketOnMessageCallback;
    onConnected: IWebSocketOnOpenCallback;
	onDisconnected: IWebSocketOnCloseCallback;
	onError: IWebSocketOnErrorCallback;
    
	constructor(hostname: string, port: string, protocol: string) {
		this.hostname = hostname;
		this.port = port;
		this.protocol = protocol;
		
		this.webSocket = null;
		this.onMessage = null;
		this.onConnected = null;
		this.onDisconnected = null;
		this.lastDisconnectionCausedByUser = false;
	}
	
	connect() {
		try {
			this.webSocket = new WebSocket("ws://" + this.hostname + ":" + this.port, this.protocol);
			
			this.webSocket.onmessage = this.onMessageReceived.bind(this);
			this.webSocket.onopen = this.onConnectionOpened.bind(this);
			this.webSocket.onclose = this.onConnectionClosed.bind(this);
			this.webSocket.onerror = this.onConnectionError.bind(this);
			
		} catch (exception) {
			console.error(exception);
		}
	}
	
	send(data: string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView) {
		if (this.webSocket.readyState != WebSocket.OPEN) {
			console.error("WebSocket is not open, it is: " + this.webSocket.readyState);
		}
		console.log("Sending");
		this.webSocket.send(data);
	}
	
	onConnectionOpened(openEvent : Event) {
		console.log("WebSocket OPEN: " + JSON.stringify(openEvent, null, 4));
		
		if (this.onConnected) {
			this.onConnected(openEvent);
		}
	}
	
	onConnectionClosed(closeEvent : CloseEvent) {
		console.log("WebSocket CLOSE: " + JSON.stringify(closeEvent, null, 4));
		
		if (this.onDisconnected) {
			this.onDisconnected(closeEvent, this.lastDisconnectionCausedByUser);
			this.lastDisconnectionCausedByUser = false;
		}
	}
	
	onConnectionError(errorEvent : Event) {
		console.log("WebSocket ERROR: " + JSON.stringify(errorEvent, null, 4));
		
		if (this.onError) {
			this.onError(errorEvent);
		}
	}
	
	onMessageReceived(messageEvent : MessageEvent) {
		let message = messageEvent.data;
		//console.log("WebSocket MESSAGE: " + message);
		
		if (this.onMessage) {
			this.onMessage(messageEvent);
		}
	}
	
	disconnect(causedByUser: boolean) {
		this.lastDisconnectionCausedByUser = causedByUser;
		this.webSocket.close();
	}

	isConnected(): boolean
	{
		return this.webSocket && (this.webSocket.readyState == 0 || this.webSocket.readyState == 1);
	}
}
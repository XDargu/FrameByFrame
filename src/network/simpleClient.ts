class Connection {
    hostname: string;
    port: number;
    protocol: string;
    webSocket: any;
    onMessage: any;
    onConnected: any;
    onDisconnected: any;
    
	constructor(hostname: string, port: number, protocol: string) {
		this.hostname = hostname;
		this.port = port;
		this.protocol = protocol;
		
		this.webSocket = null;
		this.onMessage = null;
		this.onConnected = null;
		this.onDisconnected = null;
	}
	
	connect() {
		try {
			this.webSocket = new WebSocket("ws://" + this.hostname + ":" + this.port, this.protocol);
			
			this.webSocket.onmessage = this.onMessageReceived;
			this.webSocket.onopen = this.onConnectionOpened;
			this.webSocket.onclose = this.onConnectionClosed;
			this.webSocket.onerror = this.onConnectionError;
			
		} catch (exception) {
			console.error(exception);
		}
	}
	
	send(msg : any) {
		if (this.webSocket.readyState != WebSocket.OPEN) {
			console.error("WebSocket is not open, it is: " + this.webSocket.readyState);
		}
		this.webSocket.send(msg);
	}
	
	onConnectionOpened(openEvent : any) {
		console.log("WebSocket OPEN: " + JSON.stringify(openEvent, null, 4));
		
		if (this.onConnected) {
			this.onConnected(openEvent);
		}
	}
	
	onConnectionClosed(closeEvent : any) {
		console.log("WebSocket CLOSE: " + JSON.stringify(closeEvent, null, 4));
		
		if (this.onDisconnected) {
			this.onDisconnected(closeEvent);
		}
	}
	
	onConnectionError(errorEvent : any) {
		console.log("WebSocket ERROR: " + JSON.stringify(errorEvent, null, 4));
		
		if (this.onMessage) {
			this.onMessage(errorEvent);
		}
	}
	
	onMessageReceived(messageEvent : any) {
		let message = messageEvent.data;
		console.log("WebSocket MESSAGE: " + message);
		
		if (this.onMessage) {
			this.onMessage(message);
		}
	}
	
	disconnect() {
		this.webSocket.close();
	}
}
let webSocket: WebSocket;

interface WebSocketConfig {
    onOpen?: () => void;
    onMessage: (message: MessageEvent) => void;
    onClose: (reason: string) => void;
    onError?: (error: Event) => void;
    onTryToConnect?: () => void;
}

let errorCount = 0;

export function startWebSocket(
    {
        onOpen,
        onMessage,
        onClose,
        onError,
        onTryToConnect
    }: WebSocketConfig,
    resetErrorCount?: boolean,
    logger?: (message: string) => void
): void {
    onTryToConnect?.();
    if (resetErrorCount) {
        errorCount = 0;
    }
    if (webSocket) {
        if ([ webSocket.OPEN, webSocket.CONNECTING ].includes(webSocket.readyState)) {
            return;
        } else if (webSocket.CLOSING === webSocket.readyState) {
            webSocket.onclose = () => {
                startWebSocket({ onOpen, onMessage, onClose });
            };
        }
    }
    webSocket = new WebSocket(`ws://${document.location.hostname}:1232/media-info`);

    webSocket.onopen = () => {
        onOpen?.();
        errorCount = 0;
    };
    webSocket.onmessage = (msg) => {
        onMessage(msg);
    };
    webSocket.onerror = (error) => {
        errorCount++;
        onError?.(error);
    };
    webSocket.onclose = (event) => {
        switch (event.code) {
            case 3000:
            case 3001:
            case 3002:
                onClose(event.reason);
                break;
            default:
                if (errorCount >= 3) {
                    onClose('Сервер не отвечает');
                } else {
                    window.setTimeout(() => {
                        startWebSocket({
                            onOpen,
                            onMessage,
                            onClose,
                            onError,
                            onTryToConnect
                        });
                    }, 3000);
                }
                break;
        }
    };
}

export function closeWebSocket() {
    if (webSocket) {
        if ([ webSocket.CLOSED, webSocket.CLOSING ].includes(webSocket.readyState)) {
            return;
        } else {
            webSocket.close();
        }
    }
}

import { CSSProperties, ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

import { closeWebSocket, startWebSocket } from './WebSocket';
import Marquee from './Marquee';

import './Main.css';

interface MediaInfo {
    title: string;
    artist: string;
    album_art_base64?: string;
    album_art_avg?: string;
}

interface WebSocketStateStateData {
    caption: string;
    className: string;
}

let mediaTimeoutLagId: number;

const MEDIA_TIMEOUT_LAG: number = 2000;

enum WEB_SOCKET_STATE {
    CLOSED,
    OPEN,
    CONNECTING
}

function getWebSocketStateCaptionData(state: WEB_SOCKET_STATE): WebSocketStateStateData {
    switch (state) {
        case WEB_SOCKET_STATE.CLOSED:
            return {
                caption: 'closed',
                className: 'text-red-600'
            };
        case WEB_SOCKET_STATE.OPEN:
            return {
                caption: 'open',
                className: 'text-green-600'
            };
        case WEB_SOCKET_STATE.CONNECTING:
            return {
                caption: 'trying to connect',
                className: 'text-yellow-600'
            };
    }
}

export default function Main(): ReactElement {
    const [ webSocketState, setWebSocketState ] = useState<WEB_SOCKET_STATE>(WEB_SOCKET_STATE.CONNECTING);
    const [ mediaInfo, setMediaInfo ] = useState<MediaInfo | null>(null);

    const webSocketStateCaptionData = useMemo<WebSocketStateStateData>(
        () => getWebSocketStateCaptionData(webSocketState),
        [ webSocketState ]
    );

    const webSocketCaptionClassName = useMemo<string>(
        () => clsx('text-xs', webSocketStateCaptionData.className),
        [ webSocketStateCaptionData ]
    );

    const thumbnailSrc = useMemo<string>(() => {
        return mediaInfo?.album_art_base64
            ? `data:image/jpeg;base64,${mediaInfo.album_art_base64}`
            : '';
    }, [ mediaInfo?.album_art_base64 ]);

    const shadowStyle = useMemo<CSSProperties>(() => {
        if (mediaInfo?.album_art_avg) {
            return {
                boxShadow: `0 0 40px 20px ${mediaInfo.album_art_avg}25`
            };
        }
        return {};
    }, [ mediaInfo?.album_art_avg ]);

    const thumbnailStyle = useMemo<CSSProperties>(() => {
        const style: CSSProperties = {
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat'
        };
        return style;
    }, []);

    const mediaBackground = useMemo<CSSProperties | undefined>(() => {
        if (mediaInfo?.album_art_avg) {
            return {
                backgroundColor: `${mediaInfo.album_art_avg}`,
                filter: 'brightness(0.7)',
                opacity: .9,
                ...shadowStyle
            };
        }
    }, [ mediaInfo?.album_art_avg, shadowStyle ]);

    const onWebSocketMessage = useCallback((message: MessageEvent) => {
        console.log(`web socket message: ${(message.data as string).slice(0, 50)}...`);
        const parsedData = message.data && JSON.parse(message.data);

        window.clearTimeout(mediaTimeoutLagId);

        if (parsedData?.title || parsedData?.artist) {
            setMediaInfo(parsedData);
        } else {
            mediaTimeoutLagId = window.setTimeout(() => {
                setMediaInfo(null);
            }, MEDIA_TIMEOUT_LAG);
        }

    }, []);

    const onWebSocketOpen = useCallback(() => {
        setWebSocketState(WEB_SOCKET_STATE.OPEN);
    }, []);

    const onWebSocketTryToConnect = useCallback(() => {
        setWebSocketState(WEB_SOCKET_STATE.CONNECTING);
    }, []);

    const onWebSocketClose = useCallback((reason: string) => {
        setWebSocketState(WEB_SOCKET_STATE.CLOSED);
    }, []);

    const restartWebSocket = useCallback((resetErrorCount: boolean = false) => {
        startWebSocket(
            {
                onOpen: onWebSocketOpen,
                onMessage: onWebSocketMessage,
                onClose: onWebSocketClose,
                onTryToConnect: onWebSocketTryToConnect
            },
            resetErrorCount
        );
    }, [ onWebSocketClose, onWebSocketMessage, onWebSocketOpen, onWebSocketTryToConnect ]);

    const onReconnectClick = useCallback(() => {
        restartWebSocket(true);
    }, [ restartWebSocket ]);

    useEffect(() => {
        restartWebSocket();
        return () => {
            closeWebSocket();
        };
    }, [ restartWebSocket ]);

    return <div className="media-info">
        <div className="media-info-meta flex absolute top-3 left-3 gap-1 select-none items-baseline">
            <span className="text-xs text-neutral-400">WEB SOCKET STATUS</span>
            <span className={webSocketCaptionClassName}>
                {webSocketStateCaptionData.caption}
            </span>
            {
                webSocketState === WEB_SOCKET_STATE.CLOSED
                && <span className="text-xs underline cursor-pointer" onClick={onReconnectClick}>
                    reconnect
                </span>
            }
        </div>
        {
            mediaInfo
                ? <div className="flex flex-col select-none pb-2 relative rounded-xl bg-transparent w-[250px]">
                    <div className="absolute w-full h-full bg-no-repeat -z-10 rounded-xl"
                         style={mediaBackground}/>
                    <img className="rounded-lg m-2 shadow-xl"
                         style={thumbnailStyle}
                         src={thumbnailSrc}
                         alt="thumbnail"/>
                    <div className="flex flex-col text-center px-2 text-white">
                        <Marquee className="text-2xl leading-tight font-bold"
                                 text={mediaInfo.title}/>
                        <div className="text-md leading-tight opacity-75 whitespace-nowrap text-ellipsis overflow-hidden">
                            {mediaInfo.artist}
                        </div>
                    </div>
                </div>
                : <div className="select-none text-sm text-neutral-500">
                    NO ACTIVE MEDIA SESSION
                </div>
        }
    </div>;
}

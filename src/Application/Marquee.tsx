import React, { CSSProperties, ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

interface MarqueeProps {
    className: string;
    text: string;
}

interface ContentStyleData {
    offset: number;
    transition?: number;
}

enum TextState {
    Static,
    MovingOut,
    TextJump,
    MovingIn
}

const TEXT_MOVE_SPEED: number = 50;
const TEXT_IDLE_TIME: number = 5000; // milliseconds

function Marquee({ className, text }: MarqueeProps): ReactElement {
    const textStateChangeTimeoutId = useRef<number>();

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const getContainerWidth = useCallback(() => containerRef.current?.offsetWidth, []);
    const getContentWidth = useCallback(() => contentRef.current?.offsetWidth, []);

    const [ isOverflow, setIsOverflow ] = useState<boolean>(false);
    const [ textState, setTextState ] = useState<TextState>(TextState.Static);

    const containerClasName = useMemo(() =>
            clsx('flex overflow-hidden whitespace-nowrap', { 'justify-center': !isOverflow }),
        [ isOverflow ]
    );

    const contentOffset = useMemo<ContentStyleData>(() => {
        const containerWidth = getContainerWidth();
        const contentWidth = getContentWidth();

        if (containerWidth && contentWidth) {
            window.clearTimeout(textStateChangeTimeoutId.current);
            if (isOverflow) {
                let timing;
                switch (textState) {
                    case TextState.Static:
                        textStateChangeTimeoutId.current = window.setTimeout(() => {
                            setTextState(TextState.MovingOut);
                        }, TEXT_IDLE_TIME);
                        return { offset: 0 };
                    case TextState.MovingOut:
                        timing = contentWidth / TEXT_MOVE_SPEED;
                        textStateChangeTimeoutId.current = window.setTimeout(() => {
                            setTextState(TextState.TextJump);
                        }, timing * 1000);
                        return { offset: -contentWidth, transition: timing };
                    case TextState.TextJump:
                        textStateChangeTimeoutId.current = window.setTimeout(() => {
                            setTextState(TextState.MovingIn);
                        });
                        return { offset: containerWidth };
                    case TextState.MovingIn:
                        timing = containerWidth / TEXT_MOVE_SPEED;
                        textStateChangeTimeoutId.current = window.setTimeout(() => {
                            setTextState(TextState.Static);
                        }, timing * 1000);
                        return { offset: 0, transition: timing };
                }
            } else {
                setTextState(TextState.Static);
            }
        }
        return { offset: 0 };
    }, [ getContainerWidth, getContentWidth, isOverflow, textState ]);

    const contentStyle = useMemo<CSSProperties>(() => {
        const style = {
            transform: `translateX(${contentOffset.offset}px`
        };
        if (contentOffset.transition) {
            Object.assign(
                style,
                {
                    transition: `transform ${contentOffset.transition}s linear`
                }
            );
        }
        return style;
    }, [ contentOffset ]);

    useEffect(() => {
        const checkOverflow = () => {
            const contentWidth = getContentWidth();
            const containerWidth = getContainerWidth();
            if (containerWidth && contentWidth) {
                setIsOverflow(contentWidth > containerWidth);
            }
        };

        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [ getContainerWidth, getContentWidth, text ]);

    return (
        <div ref={containerRef}
             className={containerClasName}>
            <div ref={contentRef}
                 className={className}
                 style={contentStyle}>
                {text}
            </div>
        </div>
    );
}

export default Marquee;

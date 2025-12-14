import React, { useRef } from 'react';

/**
 * React wrapper for the PIXI.js-based Viewer2D
 * This doesn't rewrite Viewer2D, just wraps it as a React component
 * 
 * Note: Event listeners are managed in useBlueprintEvents hook
 * to avoid duplication and ensure consistency.
 */
export function Viewer2DWrapper({ className = '' }) {
    const containerRef = useRef(null);

    return (
        <div
            ref={containerRef}
            id="viewer-2d"
            className={`w-full h-full ${className}`}
        />
    );
}

export default Viewer2DWrapper;

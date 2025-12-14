import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { BlueprintJS } from '../scripts/blueprint';

/**
 * Hook to initialize and access the BlueprintJS instance
 */
export function useBlueprint(options = {}) {
    const blueprintRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const initAttemptedRef = useRef(false);
    const setBlueprint = useAppStore((s) => s.setBlueprint);

    const initBlueprint = useCallback(() => {
        // Don't initialize twice
        if (blueprintRef.current || initAttemptedRef.current) return;

        // Wait for DOM elements
        const viewer2dEl = document.getElementById(options.viewer2dId || 'viewer-2d');
        const viewer3dEl = document.getElementById(options.viewer3dId || 'viewer-3d');

        if (!viewer2dEl || !viewer3dEl) {
            console.warn('Viewer containers not found, retrying...');
            return false;
        }

        initAttemptedRef.current = true;

        // Initialize BlueprintJS
        const blueprintOptions = {
            viewer2d: {
                id: options.viewer2dId || 'viewer-2d',
                viewer2dOptions: {
                    resize: true,
                },
            },
            viewer3d: {
                id: options.viewer3dId || 'viewer-3d',
                viewer3dOptions: {
                    resize: true,
                },
            },
            textureDir: options.textureDir || 'textures/',
            widget: false,
            resize: true,
        };

        try {
            blueprintRef.current = new BlueprintJS(blueprintOptions);
            setBlueprint(blueprintRef.current);
            setIsReady(true);
            console.log('BlueprintJS initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize BlueprintJS:', error);
            initAttemptedRef.current = false; // Allow retry on error
            return false;
        }
    }, [options.viewer2dId, options.viewer3dId, options.textureDir, setBlueprint]);

    useEffect(() => {
        // Use requestAnimationFrame to ensure DOM is ready
        let frameId;
        let attempts = 0;
        const maxAttempts = 10;

        const tryInit = () => {
            if (initBlueprint()) {
                return;
            }
            attempts++;
            if (attempts < maxAttempts) {
                frameId = requestAnimationFrame(tryInit);
            } else {
                console.error('Failed to initialize BlueprintJS after', maxAttempts, 'attempts');
            }
        };

        // Delay first attempt to let React render the containers
        const timeoutId = setTimeout(() => {
            tryInit();
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            if (frameId) cancelAnimationFrame(frameId);
            // Cleanup on unmount
            if (blueprintRef.current?.roomplanner?.destroy) {
                blueprintRef.current.roomplanner.destroy();
            }
        };
    }, [initBlueprint]);

    return {
        blueprint: blueprintRef.current,
        isReady,
        model: blueprintRef.current?.model,
        floorplan: blueprintRef.current?.model?.floorplan,
        floorplanner: blueprintRef.current?.floorplanner,
        roomplanner: blueprintRef.current?.roomplanner,
    };
}

export default useBlueprint;

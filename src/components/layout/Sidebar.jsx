import React from 'react';
import { useAppStore, ViewModes } from '../../stores/appStore';
import { Panel2D } from '../sidebar/Panel2D';
import { Panel3D } from '../sidebar/Panel3D';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';

export function Sidebar() {
    const currentView = useAppStore((s) => s.currentView);
    const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
    const toggleSidebar = useAppStore((s) => s.toggleSidebar);

    if (sidebarCollapsed) {
        return (
            <aside className="w-10 bg-surface border-l border-border flex flex-col items-center py-2 relative z-20">
                <button
                    onClick={toggleSidebar}
                    className="p-2 hover:bg-surface-hover rounded-md text-text-secondary hover:text-text transition-colors"
                    title="Expand sidebar"
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                </button>
            </aside>
        );
    }

    return (
        <aside className="w-sidebar bg-surface border-l border-border flex flex-col overflow-hidden relative z-20">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-sm font-medium text-text">Properties</span>
                <button
                    onClick={toggleSidebar}
                    className="p-1 hover:bg-surface-hover rounded text-text-secondary hover:text-text transition-colors"
                    title="Collapse sidebar"
                >
                    <ChevronRightIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {currentView === ViewModes.VIEW_2D ? (
                    <Panel2D />
                ) : (
                    <Panel3D />
                )}
            </div>
        </aside>
    );
}

export default Sidebar;

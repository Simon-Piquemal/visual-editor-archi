import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

export function Panel({
    title,
    children,
    collapsible = false,
    defaultCollapsed = false,
    className = '',
    headerClassName = '',
    contentClassName = '',
    actions,
}) {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);

    return (
        <div className={`bg-surface border border-border rounded-lg overflow-hidden ${className}`}>
            {title && (
                <div
                    className={`
                        flex items-center justify-between
                        px-3 py-2 border-b border-border
                        ${collapsible ? 'cursor-pointer hover:bg-surface-hover' : ''}
                        ${headerClassName}
                    `.trim()}
                    onClick={collapsible ? () => setCollapsed(!collapsed) : undefined}
                >
                    <div className="flex items-center gap-2">
                        {collapsible && (
                            collapsed
                                ? <ChevronRightIcon className="w-4 h-4 text-text-muted" />
                                : <ChevronDownIcon className="w-4 h-4 text-text-muted" />
                        )}
                        <span className="text-sm font-medium text-text">{title}</span>
                    </div>
                    {actions && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {actions}
                        </div>
                    )}
                </div>
            )}
            {(!collapsible || !collapsed) && (
                <div className={`p-3 ${contentClassName}`}>
                    {children}
                </div>
            )}
        </div>
    );
}

export function PanelSection({
    title,
    children,
    className = '',
}) {
    return (
        <div className={`space-y-2 ${className}`}>
            {title && (
                <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide">{title}</h4>
            )}
            {children}
        </div>
    );
}

export default Panel;

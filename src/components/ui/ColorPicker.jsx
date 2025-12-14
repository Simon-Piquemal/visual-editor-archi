import React, { useState, useRef, useEffect } from 'react';

const presetColors = [
    '#ffffff', '#f5f5f5', '#e0e0e0', '#9e9e9e', '#616161', '#212121',
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
    '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

export function ColorPicker({
    value = '#ffffff',
    onChange,
    label,
    showInput = true,
    presets = presetColors,
    className = '',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`flex flex-col gap-1 ${className}`} ref={containerRef}>
            {label && (
                <label className="text-xs text-text-secondary">{label}</label>
            )}
            <div className="relative">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="
                            w-8 h-8 rounded-md border border-border
                            cursor-pointer transition-transform hover:scale-105
                        "
                        style={{ backgroundColor: value }}
                    />
                    {showInput && (
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => onChange?.(e.target.value)}
                            className="
                                flex-1 px-2 py-1.5
                                bg-surface border border-border rounded-md
                                text-sm text-text font-mono
                                focus:border-primary focus:outline-none
                            "
                        />
                    )}
                </div>
                {isOpen && (
                    <div className="
                        absolute top-full left-0 mt-1 z-50
                        p-2 bg-surface border border-border rounded-lg shadow-lg
                    ">
                        <div className="grid grid-cols-6 gap-1 mb-2">
                            {presets.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => {
                                        onChange?.(color);
                                        setIsOpen(false);
                                    }}
                                    className={`
                                        w-6 h-6 rounded border
                                        cursor-pointer transition-transform hover:scale-110
                                        ${value === color ? 'border-primary ring-1 ring-primary' : 'border-border'}
                                    `}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                        <input
                            type="color"
                            value={value}
                            onChange={(e) => onChange?.(e.target.value)}
                            className="w-full h-8 cursor-pointer"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default ColorPicker;

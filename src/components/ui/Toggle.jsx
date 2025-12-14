import React from 'react';

export function Toggle({
    checked = false,
    onChange,
    label,
    disabled = false,
    className = '',
    ...props
}) {
    return (
        <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
            <div className="relative">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange?.(e.target.checked)}
                    disabled={disabled}
                    className="sr-only"
                    {...props}
                />
                <div className={`
                    w-9 h-5 rounded-full transition-colors duration-200
                    ${checked ? 'bg-primary' : 'bg-border'}
                `}>
                    <div className={`
                        absolute top-0.5 left-0.5
                        w-4 h-4 rounded-full bg-white
                        transition-transform duration-200
                        ${checked ? 'translate-x-4' : 'translate-x-0'}
                    `} />
                </div>
            </div>
            {label && (
                <span className="text-sm text-text">{label}</span>
            )}
        </label>
    );
}

export default Toggle;

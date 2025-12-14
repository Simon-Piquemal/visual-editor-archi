import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

export function Select({
    value,
    onChange,
    options = [],
    placeholder = 'Select...',
    disabled = false,
    label,
    className = '',
    ...props
}) {
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {label && (
                <label className="text-xs text-text-secondary">{label}</label>
            )}
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange?.(e.target.value, e)}
                    disabled={disabled}
                    className={`
                        w-full px-2 py-1.5 pr-8
                        bg-surface border border-border rounded-md
                        text-sm text-text
                        appearance-none cursor-pointer
                        focus:border-primary focus:outline-none
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors duration-150
                    `.trim()}
                    {...props}
                >
                    {placeholder && (
                        <option value="" disabled>{placeholder}</option>
                    )}
                    {options.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
                <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
        </div>
    );
}

export default Select;

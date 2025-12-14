import React from 'react';

export function Input({
    type = 'text',
    value,
    onChange,
    placeholder,
    disabled = false,
    label,
    suffix,
    prefix,
    className = '',
    inputClassName = '',
    min,
    max,
    step,
    ...props
}) {
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {label && (
                <label className="text-xs text-text-secondary">{label}</label>
            )}
            <div className="relative flex items-center">
                {prefix && (
                    <span className="absolute left-2 text-text-muted text-xs">{prefix}</span>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange?.(e.target.value, e)}
                    placeholder={placeholder}
                    disabled={disabled}
                    min={min}
                    max={max}
                    step={step}
                    className={`
                        w-full px-2 py-1.5
                        bg-surface border border-border rounded-md
                        text-sm text-text
                        placeholder:text-text-muted
                        focus:border-primary focus:outline-none
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors duration-150
                        ${prefix ? 'pl-6' : ''}
                        ${suffix ? 'pr-8' : ''}
                        ${inputClassName}
                    `.trim()}
                    {...props}
                />
                {suffix && (
                    <span className="absolute right-2 text-text-muted text-xs">{suffix}</span>
                )}
            </div>
        </div>
    );
}

export function NumberInput({
    value,
    onChange,
    min,
    max,
    step = 1,
    ...props
}) {
    const handleChange = (val) => {
        const num = parseFloat(val);
        if (!isNaN(num)) {
            const clamped = Math.min(Math.max(num, min ?? -Infinity), max ?? Infinity);
            onChange?.(clamped);
        } else if (val === '' || val === '-') {
            onChange?.(val);
        }
    };

    return (
        <Input
            type="number"
            value={value}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            {...props}
        />
    );
}

export default Input;

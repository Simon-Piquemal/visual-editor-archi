import React from 'react';

export function Slider({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    label,
    showValue = true,
    suffix = '',
    disabled = false,
    className = '',
    ...props
}) {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {(label || showValue) && (
                <div className="flex items-center justify-between">
                    {label && (
                        <label className="text-xs text-text-secondary">{label}</label>
                    )}
                    {showValue && (
                        <span className="text-xs text-text-muted">{value}{suffix}</span>
                    )}
                </div>
            )}
            <div className="relative h-4 flex items-center">
                <input
                    type="range"
                    value={value}
                    onChange={(e) => onChange?.(parseFloat(e.target.value))}
                    min={min}
                    max={max}
                    step={step}
                    disabled={disabled}
                    className="
                        w-full h-1.5 rounded-full appearance-none cursor-pointer
                        bg-border
                        disabled:opacity-50 disabled:cursor-not-allowed
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-3.5
                        [&::-webkit-slider-thumb]:h-3.5
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-primary
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:transition-transform
                        [&::-webkit-slider-thumb]:hover:scale-110
                        [&::-moz-range-thumb]:w-3.5
                        [&::-moz-range-thumb]:h-3.5
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-primary
                        [&::-moz-range-thumb]:border-0
                        [&::-moz-range-thumb]:cursor-pointer
                    "
                    style={{
                        background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${percentage}%, #2a2a2a ${percentage}%, #2a2a2a 100%)`
                    }}
                    {...props}
                />
            </div>
        </div>
    );
}

export default Slider;

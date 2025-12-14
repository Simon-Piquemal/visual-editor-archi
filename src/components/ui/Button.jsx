import React from 'react';

const variants = {
    primary: 'bg-primary hover:bg-primary-hover text-white',
    secondary: 'bg-surface hover:bg-surface-hover text-text border border-border',
    ghost: 'bg-transparent hover:bg-surface-hover text-text-secondary hover:text-text',
    danger: 'bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30',
};

const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
    icon: 'p-1.5',
};

export function Button({
    children,
    variant = 'secondary',
    size = 'md',
    disabled = false,
    active = false,
    className = '',
    onClick,
    title,
    type = 'button',
    ...props
}) {
    return (
        <button
            type={type}
            disabled={disabled}
            title={title}
            onClick={onClick}
            className={`
                inline-flex items-center justify-center gap-1.5
                rounded-md font-medium
                transition-colors duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variants[variant]}
                ${sizes[size]}
                ${active ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}
                ${className}
            `.trim()}
            {...props}
        >
            {children}
        </button>
    );
}

export function IconButton({
    icon: Icon,
    size = 'md',
    iconSize = 18,
    ...props
}) {
    const iconSizes = {
        sm: 14,
        md: 18,
        lg: 22,
        icon: 20,
    };

    return (
        <Button size="icon" {...props}>
            <Icon size={iconSizes[size] || iconSize} />
        </Button>
    );
}

export default Button;

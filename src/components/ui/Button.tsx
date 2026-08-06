import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Renders a spinner and blocks interaction. Label stays visible to avoid layout shift. */
  loading?: boolean;
  iconLeft?: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-chlorophyll text-basalt-950 hover:brightness-110 active:brightness-95 font-medium',
  secondary: 'bg-basalt-700 text-bone border border-basalt-600 hover:bg-basalt-600',
  ghost:     'bg-transparent text-ash hover:text-bone hover:bg-basalt-800',
  danger:    'bg-ember text-basalt-950 hover:brightness-110 font-medium',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-[3px]',
  md: 'h-10 px-4 text-[15px] rounded-md',
  lg: 'h-12 px-6 text-[17px] rounded-md',
};

/**
 * Rótulo del botón nombra lo que ocurre, y el mismo verbo se mantiene en el resultado.
 * `Simular el año` produce el aviso `Año simulado`. Nunca `Enviar`, nunca `Aceptar`.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary', size = 'md', loading = false,
  iconLeft, className = '', children, disabled, ...rest
}) => (
  <button
    className={`inline-flex items-center justify-center gap-2 select-none
      transition-[filter,background-color,transform] duration-[var(--dur-quick)] ease-[var(--ease-settle)]
      active:translate-y-px disabled:opacity-45 disabled:pointer-events-none
      ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...rest}
  >
    {loading
      ? <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden />
      : iconLeft}
    {children}
  </button>
);

export default Button;

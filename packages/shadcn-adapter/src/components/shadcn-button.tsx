import * as React from 'react';
import { Button } from '../upstream/index.js';

export interface ShadcnButtonProps {
  disabled?: boolean;
  /**
   * Upstream shadcn has no loading prop (mapping status: unsupported). The
   * composition realizes the contract requirement: while loading, the button
   * is aria-busy, disabled and must not emit click.
   */
  loading?: boolean;
  /** Contract default is "button"; raw shadcn leaves native default (submit). */
  type?: 'button' | 'submit' | 'reset';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  className?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

/**
 * Thin composition over the vendored shadcn Button — only fills gaps the
 * frozen contract requires; upstream styling/variants are preserved.
 */
export const ShadcnButton = React.forwardRef<HTMLButtonElement, ShadcnButtonProps>(
  function ShadcnButton(
    { disabled = false, loading = false, type = 'button', variant = 'default', size = 'default', onClick, children, className, ...rest },
    ref,
  ) {
    return (
      <Button
        ref={ref}
        type={type}
        variant={variant}
        size={size}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={className}
        onClick={(event) => {
          if (loading || disabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          onClick?.(event);
        }}
        {...rest}
      >
        {children}
      </Button>
    );
  },
);

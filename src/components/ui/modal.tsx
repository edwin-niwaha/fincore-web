'use client';

import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const sizeMap = {
  sm: '28rem',
  md: '36rem',
  lg: '48rem',
  xl: '64rem',
  '2xl': '72rem',
  '3xl': '84rem',
} as const;

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'lg',
  className,
  bodyClassName,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof sizeMap;
  className?: string;
  bodyClassName?: string;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-dialog"
        style={{ '--modal-width': sizeMap[size] } as CSSProperties}
      >
        <div className={cn('modal-content', className)}>
          <div className="modal-header">
            <div className="min-w-0">
              <h2
                id="modal-title"
                className="text-lg font-black tracking-tight text-slate-950"
              >
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              ) : null}
            </div>

            <button
              type="button"
              className="modal-close shrink-0"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className={cn('modal-body', bodyClassName)}>{children}</div>

          {footer ? <div className="modal-footer">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

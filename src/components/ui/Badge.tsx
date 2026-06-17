import * as React from 'react'
import { cn } from '@/lib/cn'
import styles from './Badge.module.css'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(styles.badge, styles[variant], className)}
      {...props}
    />
  ),
)
Badge.displayName = 'Badge'

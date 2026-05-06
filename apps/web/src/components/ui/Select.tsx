import React from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon?: React.ElementType;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, label, icon: Icon = ChevronDown, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="text-sm font-medium text-text-secondary mb-2 block">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={clsx(
              'input-field pr-10 appearance-none cursor-pointer w-full',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Icon className="w-4 h-4 text-text-muted" />
          </div>
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';

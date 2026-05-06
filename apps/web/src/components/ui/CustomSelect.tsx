'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  icon?: React.ElementType;
  placeholder?: string;
}

export function CustomSelect({ 
  options, 
  value, 
  onChange, 
  label, 
  icon: Icon = Filter,
  placeholder = 'Select option...'
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-text-secondary mb-2 block">
          {label}
        </label>
      )}
      
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all duration-200',
          'bg-card hover:border-primary/50 text-text-primary text-sm',
          isOpen ? 'border-primary ring-2 ring-primary/10' : 'border-ui-border'
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-text-muted" />
          <span className={clsx(!selectedOption && 'text-text-muted opacity-50')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className={clsx('w-4 h-4 text-text-muted transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 py-2 bg-card border border-ui-border rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 origin-top">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={clsx(
                'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left',
                value === option.value 
                  ? 'text-primary bg-primary/10 font-medium' 
                  : 'text-text-secondary hover:bg-primary/5 hover:text-text-primary'
              )}
            >
              <span>{option.label}</span>
              {value === option.value && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

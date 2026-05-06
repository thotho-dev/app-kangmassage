'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { clsx } from 'clsx';
import { Portal } from './Portal';

interface CustomDatePickerProps {
  label?: string;
  value: string; // ISO string or YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
}

export function CustomDatePicker({ label, value, onChange, required }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const selectedDate = value ? startOfDay(new Date(value)) : null;

  const toggleOpen = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY, // Use top instead of bottom
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Check if click is on the portal content (we'll need a way to detect this)
        // For simplicity, we can close it, but if it's a portal we need to be careful.
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleDateClick = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <button type="button" onClick={prevMonth} className="p-1 hover:bg-primary/10 rounded-lg transition-colors">
        <ChevronLeft className="w-4 h-4 text-text-primary" />
      </button>
      <h3 className="font-bold text-text-primary">
        {format(currentMonth, 'MMMM yyyy')}
      </h3>
      <button type="button" onClick={nextMonth} className="p-1 hover:bg-primary/10 rounded-lg transition-colors">
        <ChevronRight className="w-4 h-4 text-text-primary" />
      </button>
    </div>
  );

  const renderDays = () => {
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map(day => (
          <div key={day} className="text-center text-[10px] font-bold text-text-muted uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const isSelected = selectedDate && isSameDay(currentDay, selectedDate);
        const isCurrentMonth = isSameMonth(currentDay, monthStart);
        const isToday = isSameDay(currentDay, new Date());

        days.push(
          <div
            key={`day-${currentDay.getTime()}`}
            className={clsx(
              "h-9 flex items-center justify-center text-sm rounded-xl cursor-pointer transition-all",
              !isCurrentMonth ? "text-text-muted/20" : "text-text-primary hover:bg-primary/20",
              isSelected ? "bg-primary text-white shadow-lg shadow-primary/30 font-bold scale-110 z-10" : "",
              isToday && !isSelected ? "border border-primary/50 text-primary" : ""
            )}
            onClick={() => handleDateClick(currentDay)}
          >
            {format(currentDay, 'd')}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-1" key={`row-${day.getTime()}`}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="space-y-1">{rows}</div>;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="text-sm text-text-primary/60 mb-2 block">{label}</label>}
      <div 
        className={clsx(
          "input-field flex items-center justify-between cursor-pointer group transition-all",
          isOpen ? "border-primary ring-1 ring-primary/20" : "hover:border-primary/50"
        )}
        onClick={toggleOpen}
      >
        <span className={clsx(value ? "text-text-primary" : "text-text-muted/40")}>
          {value && !isNaN(new Date(value).getTime()) ? format(new Date(value), 'dd/MM/yyyy') : 'DD/MM/YYYY'}
        </span>
        <CalendarIcon className={clsx("w-4 h-4 transition-colors", isOpen ? "text-primary" : "text-text-muted/40 group-hover:text-primary")} />
      </div>

      {isOpen && (
        <Portal>
          <div 
            className="fixed inset-0 z-[10010]" 
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="fixed z-[10011] animate-in fade-in zoom-in-95 duration-200"
            style={{ 
              top: coords.top - 8, 
              left: coords.left, 
              width: Math.max(coords.width, 280),
              transform: 'translateY(-100%)'
            }}
          >
            <div className="glass-card p-4 shadow-2xl border border-ui-border bg-card/95 backdrop-blur-xl">
              {renderHeader()}
              {renderDays()}
              {renderCells()}
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-ui-border">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange('');
                    setIsOpen(false);
                  }}
                  className="text-xs font-bold text-danger hover:opacity-80 transition-opacity"
                >
                  Clear
                </button>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const today = new Date();
                    setCurrentMonth(today);
                    handleDateClick(today);
                  }}
                  className="text-xs font-bold text-primary hover:opacity-80 transition-opacity"
                >
                  Today
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

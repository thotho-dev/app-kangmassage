'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Portal } from './Portal';
import { useLanguage } from '@/context/LanguageContext';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  type = 'danger'
}: ConfirmModalProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const typeStyles = {
    danger: 'bg-danger/10 text-danger border-danger/20 hover:bg-danger/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20',
    info: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
  };

  const btnStyles = {
    danger: 'btn-danger', // Assuming you have this or I'll use inline
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    info: 'btn-primary'
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
        
        <div className="relative w-full max-w-sm glass-card border-white/10 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${typeStyles[type]}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">{title}</h3>
            </div>
            <button onClick={onCancel} className="text-text-muted hover:text-text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-text-secondary leading-relaxed">
              {message}
            </p>
          </div>

          {/* Footer */}
          <div className="p-4 bg-white/5 flex gap-3">
            <button 
              onClick={onCancel} 
              className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-text-muted hover:text-text-primary hover:bg-white/5 transition-all"
            >
              {cancelText || t('cancel')}
            </button>
            <button 
              onClick={onConfirm}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${
                type === 'danger' ? 'bg-danger text-white shadow-danger/20' : 
                type === 'warning' ? 'bg-yellow-500 text-white shadow-yellow-500/20' : 
                'bg-primary text-white shadow-primary/20'
              }`}
            >
              {confirmText || t('confirm') || 'Ya, Lanjutkan'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

'use client';

import { useState, createContext, useContext, useCallback, type ReactNode } from 'react';
import Modal from './modal';
import Button from './button';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
  return context;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    message: '',
  });
  const [resolvePromise, setResolvePromise] = useState<(value: boolean) => void>();

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOptions(opts);
      setResolvePromise(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = () => {
    resolvePromise?.(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    resolvePromise?.(false);
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal isOpen={isOpen} onClose={handleCancel} title={options.title} size="sm">
        <p className="text-[var(--color-text-secondary)] mb-6">{options.message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleCancel}>
            {options.cancelText || 'Cancel'}
          </Button>
          <Button
            variant={options.variant || 'primary'}
            onClick={handleConfirm}
          >
            {options.confirmText || 'Confirm'}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

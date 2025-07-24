import { useState, useCallback } from 'react';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import type { ConfirmationDialogProps } from '../components/common/ConfirmationDialog';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface UseConfirmationReturn {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
  ConfirmationComponent: React.FC;
}

export const useConfirmation = (): UseConfirmationReturn => {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: ConfirmationOptions;
    resolve: ((value: boolean) => void) | null;
    loading: boolean;
  }>({
    isOpen: false,
    options: {
      title: '',
      message: '',
    },
    resolve: null,
    loading: false,
  });

  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        options,
        resolve,
        loading: false,
      });
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (dialogState.resolve) {
      setDialogState(prev => ({ ...prev, loading: true }));
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      dialogState.resolve(true);
      setDialogState({
        isOpen: false,
        options: { title: '', message: '' },
        resolve: null,
        loading: false,
      });
    }
  }, [dialogState.resolve]);

  const handleCancel = useCallback(() => {
    if (dialogState.resolve) {
      dialogState.resolve(false);
      setDialogState({
        isOpen: false,
        options: { title: '', message: '' },
        resolve: null,
        loading: false,
      });
    }
  }, [dialogState.resolve]);

  const ConfirmationComponent: React.FC = () => (
    <ConfirmationDialog
      isOpen={dialogState.isOpen}
      title={dialogState.options.title}
      message={dialogState.options.message}
      confirmText={dialogState.options.confirmText}
      cancelText={dialogState.options.cancelText}
      type={dialogState.options.type}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      loading={dialogState.loading}
    />
  );

  return {
    confirm,
    ConfirmationComponent,
  };
};

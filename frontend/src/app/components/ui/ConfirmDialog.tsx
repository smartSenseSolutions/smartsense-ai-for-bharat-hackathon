import { AlertCircle, X } from 'lucide-react';
import { Button } from './button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-[#3B82F6]" />
        </div>

        {/* Content */}
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
          {title}
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          {description}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            className="flex-1 h-11 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 h-11 bg-[#3B82F6] hover:bg-[#2563EB]"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

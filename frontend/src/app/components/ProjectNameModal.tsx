import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';

interface ProjectNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (projectName: string) => void;
}

export function ProjectNameModal({ isOpen, onClose, onCreate }: ProjectNameModalProps) {
  const [projectName, setProjectName] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (projectName.trim()) {
      onCreate(projectName);
      setProjectName('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && projectName.trim()) {
      handleCreate();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[rgba(0,0,0,0.7)] bg-opacity-50 z-50 flex items-start pt-32 justify-center animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Create New Project</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Project Name
            </label>
            <Input
              placeholder="e.g., Medical Equipment Procurement 2026"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-12 text-base border-0 bg-[#F3F4F6]"
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 h-11 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!projectName.trim()}
              className="flex-1 h-11 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
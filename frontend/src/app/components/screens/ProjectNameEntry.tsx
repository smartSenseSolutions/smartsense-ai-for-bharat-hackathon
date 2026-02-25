import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';

interface ProjectNameEntryProps {
  onBack: () => void;
  onNext: (projectName: string) => void;
}

export function ProjectNameEntry({ onBack, onNext }: ProjectNameEntryProps) {
  const [projectName, setProjectName] = useState('');

  const handleContinue = () => {
    if (projectName.trim()) {
      onNext(projectName);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-[560px]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>

        <div className="bg-white rounded-2xl p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Create New Project</h1>
            <p className="text-sm text-gray-500">Let's start by giving your project a name</p>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Project Name
            </label>
            <Input
              placeholder="e.g., Medical Equipment Procurement 2026"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="h-12 text-base border-0 bg-[#F3F4F6]"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && projectName.trim()) {
                  handleContinue();
                }
              }}
              autoFocus
            />
          </div>

          <Button
            onClick={handleContinue}
            disabled={!projectName.trim()}
            className="w-full h-12 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to RFP Creation
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

import { Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface ApprovalPendingProps {
  projectName: string;
  onBackToProjects: () => void;
}

export function ApprovalPending({ projectName, onBackToProjects }: ApprovalPendingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-[560px] text-center">
        <div className="bg-white rounded-2xl p-8">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-[#3B82F6]" />
          </div>

          {/* Message */}
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">
            RFP Sent for Approval
          </h1>
          <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">
            Your RFP for "{projectName}" has been submitted for approval. You'll be notified once it's reviewed by the approval team.
          </p>

          {/* Approval Timeline */}
          <div className="bg-[#F3F4F6] rounded-xl p-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">RFP Created</p>
                  <p className="text-xs text-gray-500">Just now</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-[#3B82F6]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">Pending Approval</p>
                  <p className="text-xs text-gray-500">Waiting for review</p>
                </div>
              </div>

              <div className="flex items-center gap-3 opacity-40">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">Approved & Active</p>
                  <p className="text-xs text-gray-500">Will appear in Projects</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <Button
            onClick={onBackToProjects}
            className="w-full h-12 bg-[#3B82F6] hover:bg-[#2563EB]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    </div>
  );
}

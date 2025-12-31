import { useState } from "react";
import { X, ChevronUp, ChevronDown, Check, FileIcon } from "lucide-react";

interface UploadProgressProps {
  fileName: string;
  progress: number;
  isComplete: boolean;
  onClose: () => void;
  onCancel: () => void;
}

const UploadProgress = ({ fileName, progress, isComplete, onClose, onCancel }: UploadProgressProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 w-[360px] bg-background rounded-lg shadow-google-lg border border-border z-50 overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 bg-muted/50 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          {isComplete ? (
            <div className="w-5 h-5 rounded-full bg-google-green flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-google-blue border-t-transparent animate-spin" />
          )}
          <span className="text-sm font-medium text-foreground">
            {isComplete ? "1 upload complete" : "Uploading 1 item"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            {isCollapsed ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* File Details */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-3">
            <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{fileName}</p>
              {!isComplete && (
                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-google-blue transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
            {isComplete ? (
              <div className="w-5 h-5 rounded-full bg-google-green flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-white" />
              </div>
            ) : (
              <button
                onClick={onCancel}
                className="p-1 hover:bg-muted rounded-full transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadProgress;
import { useState } from "react";
import { FileText, FileSpreadsheet, Presentation, Image, FileIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UploadFile {
  file: File;
  type: string;
}

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: FileList | null;
  onUpload: (files: FileList) => void;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "doc":
    case "docx":
    case "txt":
      return <FileText className="w-8 h-8 text-google-blue" />;
    case "xls":
    case "xlsx":
    case "csv":
      return <FileSpreadsheet className="w-8 h-8 text-google-green" />;
    case "ppt":
    case "pptx":
      return <Presentation className="w-8 h-8 text-google-yellow" />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
    case "svg":
      return <Image className="w-8 h-8 text-google-red" />;
    case "pdf":
      return <FileIcon className="w-8 h-8 text-google-red" />;
    default:
      return <FileIcon className="w-8 h-8 text-muted-foreground" />;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const UploadModal = ({ open, onOpenChange, files, onUpload }: UploadModalProps) => {
  const fileArray = files ? Array.from(files) : [];

  const handleUpload = () => {
    if (files) {
      onUpload(files);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Upload files</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            {fileArray.length} file{fileArray.length !== 1 ? 's' : ''} selected for upload
          </p>
          
          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-3">
              {fileArray.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border border-border"
                >
                  {getFileIcon(file.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            onClick={handleCancel}
            className="text-primary hover:bg-primary/5"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            className="bg-primary text-primary-foreground hover:bg-google-blue-hover"
          >
            Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;

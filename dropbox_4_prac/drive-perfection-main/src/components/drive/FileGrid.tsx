import {
  Folder,
  FileText,
  Image,
  FileSpreadsheet,
  Presentation,
  MoreVertical,
  File
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import FileList from "./FileList";
import { useState } from "react";

export interface FileItem {
  fileId?: string;
  id: string;
  name: string;
  type: "folder" | "document" | "spreadsheet" | "presentation" | "image" | "pdf";
  modifiedDate: string;
  size?: string;
  owner?: string;
  shared?: boolean;
  uploadedAt?: string;
}

interface FileGridProps {
  viewMode: "grid" | "list";
  files: FileItem[];
}

const getFileIcon = (type: FileItem["type"]) => {
  const iconClasses = "w-6 h-6";

  switch (type) {
    case "folder":
      return <Folder className={cn(iconClasses, "text-google-gray-500")} fill="hsl(var(--google-gray-300))" />;
    case "document":
      return <FileText className={cn(iconClasses, "text-google-blue")} />;
    case "spreadsheet":
      return <FileSpreadsheet className={cn(iconClasses, "text-google-green")} />;
    case "presentation":
      return <Presentation className={cn(iconClasses, "text-google-yellow")} />;
    case "image":
      return <Image className={cn(iconClasses, "text-google-red")} />;
    case "pdf":
      return <File className={cn(iconClasses, "text-google-red")} />;
    default:
      return <FileText className={cn(iconClasses, "text-muted-foreground")} />;
  }
};

const FileCard = ({ file }: { file: FileItem }) => {
  console.log("file", file);

  return (
    <div className="group relative flex flex-col rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-all duration-150 overflow-hidden">
      {/* Thumbnail Area */}
      <div className="flex items-center justify-center h-[140px] bg-google-gray-50 border-b border-border">
        <div className="scale-150">
          {getFileIcon(file.type)}
        </div>
      </div>

      {/* Info Area */}
      <div className="flex items-center gap-3 p-3">
        <div className="shrink-0">
          {getFileIcon(file.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
};

const FileGrid = ({ viewMode, files }: FileGridProps) => {
  const [previewFile, setPreviewFile] = useState<{
    fileId: string;
    name: string;
    type: string;
    url?: string;
  } | null>(null);

  if (viewMode === "list") {
    return (
      <div className="p-6">
        <FileList files={files} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* Files Section */}
      {files.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-foreground mb-4">Files</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {files.map((doc) => (
              <FileCard key={doc.fileId ?? doc.id} file={doc} />
            ))}
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">No files to display.</p>
      )}
    </div>
  );
};

export default FileGrid;

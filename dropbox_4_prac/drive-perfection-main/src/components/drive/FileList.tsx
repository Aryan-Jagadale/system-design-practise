import { 
  Folder, 
  FileText, 
  Image, 
  FileSpreadsheet, 
  Presentation,
  MoreVertical,
  File,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface FileItem {
  id: string;
  name: string;
  type: "folder" | "document" | "spreadsheet" | "presentation" | "image" | "pdf";
  modifiedDate: string;
  size?: string;
  owner?: string;
  shared?: boolean;
}

interface FileListProps {
  files: FileItem[];
}

const getFileIcon = (type: FileItem["type"], size: "sm" | "md" = "sm") => {
  const iconClasses = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  
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

const FileList = ({ files }: FileListProps) => {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center h-10 px-4 border-b border-border text-xs font-medium text-muted-foreground">
        <div className="w-10 flex items-center justify-center">
          <Checkbox className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">Name</div>
        <div className="w-32 text-center hidden md:block">Owner</div>
        <div className="w-40 text-center hidden lg:block">Last modified</div>
        <div className="w-24 text-center hidden xl:block">File size</div>
        <div className="w-10" />
      </div>

      {/* File Rows */}
      <div className="divide-y divide-border">
        {files.map((file) => (
          <div 
            key={file.id}
            className="group flex items-center h-12 px-4 hover:bg-muted/50 cursor-pointer transition-colors"
          >
            {/* Checkbox */}
            <div className="w-10 flex items-center justify-center">
              <Checkbox className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0 flex items-center gap-3">
              {getFileIcon(file.type)}
              <span className="text-sm text-foreground truncate">{file.name}</span>
              {file.shared && (
                <span className="text-xs text-muted-foreground">(shared)</span>
              )}
            </div>

            {/* Owner */}
            <div className="w-32 text-center hidden md:block">
              <span className="text-sm text-muted-foreground">{file.owner || "me"}</span>
            </div>

            {/* Last modified */}
            <div className="w-40 text-center hidden lg:block">
              <span className="text-sm text-muted-foreground">{file.modifiedDate}</span>
            </div>

            {/* File size */}
            <div className="w-24 text-center hidden xl:block">
              <span className="text-sm text-muted-foreground">{file.size || "—"}</span>
            </div>

            {/* Actions */}
            <div className="w-10 flex items-center justify-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Star className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileList;

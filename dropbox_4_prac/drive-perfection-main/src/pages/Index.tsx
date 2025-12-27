import { useState } from "react";
import Header from "@/components/drive/Header";
import Sidebar from "@/components/drive/Sidebar";
import ContentHeader from "@/components/drive/ContentHeader";
import QuickAccess from "@/components/drive/QuickAccess";
import FileGrid, { FileItem } from "@/components/drive/FileGrid";

const initialFiles: FileItem[] = [
  // { id: "5", name: "Q4 Report.docx", type: "document", modifiedDate: "Dec 22, 2024", size: "2.4 MB", owner: "me" },
  // { id: "6", name: "Budget 2025.xlsx", type: "spreadsheet", modifiedDate: "Dec 21, 2024", size: "1.8 MB", owner: "me" },
  // { id: "7", name: "Presentation.pptx", type: "presentation", modifiedDate: "Dec 19, 2024", size: "5.2 MB", owner: "me" },
  // { id: "8", name: "Screenshot.png", type: "image", modifiedDate: "Dec 17, 2024", size: "842 KB", owner: "me" },
  // { id: "9", name: "Contract.pdf", type: "pdf", modifiedDate: "Dec 14, 2024", size: "1.1 MB", owner: "Jane Smith" },
  // { id: "10", name: "Meeting Notes.docx", type: "document", modifiedDate: "Dec 12, 2024", size: "156 KB", owner: "me" },
];

const Index = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [files, setFiles] = useState<FileItem[]>(initialFiles);

  const handleFileUpload = (uploadedFiles: FileList) => {
    const newFiles: FileItem[] = Array.from(uploadedFiles).map((file, index) => ({
      id: `uploaded-${Date.now()}-${index}`,
      name: file.name,
      type: getFileType(file.name),
      modifiedDate: new Date().toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric", 
        year: "numeric" 
      }),
      size: formatFileSize(file.size),
      owner: "me",
    }));

    setFiles(prev => [...newFiles, ...prev]);
  };

  const handleFolderCreate = (name: string) => {
    const newFolder: FileItem = {
      id: `folder-${Date.now()}`,
      name,
      type: "folder",
      modifiedDate: new Date().toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric", 
        year: "numeric" 
      }),
      owner: "me",
    };

    setFiles(prev => [newFolder, ...prev]);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          onFileUpload={handleFileUpload}
          onFolderCreate={handleFolderCreate}
        />
        
        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden border-l border-border">
          <ContentHeader 
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
          <div className="flex-1 overflow-y-auto">
            {/* <QuickAccess /> */}
            <FileGrid viewMode={viewMode} files={files} />
          </div>
        </main>
      </div>
    </div>
  );
};

// Helper functions
function getFileType(filename: string): FileItem["type"] {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "doc":
    case "docx":
    case "txt":
      return "document";
    case "xls":
    case "xlsx":
    case "csv":
      return "spreadsheet";
    case "ppt":
    case "pptx":
      return "presentation";
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
    case "svg":
      return "image";
    case "pdf":
      return "pdf";
    default:
      return "document";
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default Index;

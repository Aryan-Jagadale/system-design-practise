import { useState, useEffect } from "react";
import Header from "@/components/drive/Header";
import Sidebar from "@/components/drive/Sidebar";
import ContentHeader from "@/components/drive/ContentHeader";
import FileGrid, { FileItem } from "@/components/drive/FileGrid";
import { toast } from "@/hooks/use-toast";
const URL = import.meta.env.VITE_API_URL;


const Index = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);


  const handleFileUpload = (uploadedFiles: FileList) => {
    fetchFileList();
  };


  const fetchFileList = async () => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch(`${URL}/list-files`);
      if (!res.ok) throw new Error("Failed to load files");

      const data = await res.json();
      setFiles(data.files || []);
      toast({ title: "Files loaded", description: `Loaded ${data.files.length} files.` });
    } catch (err: any) {
      console.error("Error fetching files:", err);
      toast({
        title: "Error",
        description: err.message || "An error occurred while fetching files.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchFileList();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          onFileUpload={handleFileUpload}
          onFolderCreate={() => { }}
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

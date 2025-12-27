import { useState, useRef } from "react";
import { 
  Plus, 
  FolderPlus, 
  Upload, 
  FolderUp,
  FileText,
  Table,
  Presentation,
  FileSpreadsheet,
  FormInput
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import UploadModal from "./UploadModal";

interface NewButtonDropdownProps {
  onFileUpload?: (files: FileList) => void;
  onFolderCreate?: (name: string) => void;
}

const NewButtonDropdown = ({ onFileUpload, onFolderCreate }: NewButtonDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
      setUploadModalOpen(true);
    }
  };

  const handleConfirmUpload = (files: FileList) => {
    if (onFileUpload) {
      onFileUpload(files);
    }
    toast({
      title: "Files uploaded",
      description: `${files.length} file(s) uploaded successfully`,
    });
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSelectedFiles(null);
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      toast({
        title: "Folder selected",
        description: `${files.length} file(s) from folder ready to upload`,
      });
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }
  };

  const handleCreateFolder = () => {
    if (folderName.trim()) {
      if (onFolderCreate) {
        onFolderCreate(folderName.trim());
      }
      toast({
        title: "Folder created",
        description: `"${folderName}" has been created`,
      });
      setFolderName("");
      setFolderDialogOpen(false);
    }
  };

  return (
    <>
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        multiple
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderSelect}
        className="hidden"
        // @ts-ignore - webkitdirectory is not in types
        webkitdirectory=""
        directory=""
        multiple
      />

      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            className="h-14 px-6 gap-3 shadow-google hover:shadow-google-hover bg-background text-foreground border-0 transition-all duration-200"
            variant="ghost"
            style={{
              borderRadius:"1.05rem"
            }}
          >
            <Plus className="w-6 h-6 text-foreground" />
            <span className="text-sm font-medium">New</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-[300px] p-2 rounded-lg"
          sideOffset={8}
        >
          {/* New Folder */}
          <DropdownMenuItem 
            className="flex items-center gap-4 px-4 py-3 cursor-pointer rounded-lg"
            onClick={() => {
              setIsOpen(false);
              setFolderDialogOpen(true);
            }}
          >
            <FolderPlus className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">New folder</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-2" />

          {/* File Upload */}
          <DropdownMenuItem 
            className="flex items-center gap-4 px-4 py-3 cursor-pointer rounded-lg"
            onClick={() => {
              setIsOpen(false);
              fileInputRef.current?.click();
            }}
          >
            <Upload className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">File upload</span>
          </DropdownMenuItem>

          {/* Folder Upload */}
          <DropdownMenuItem 
            className="flex items-center gap-4 px-4 py-3 cursor-pointer rounded-lg"
            onClick={() => {
              setIsOpen(false);
              folderInputRef.current?.click();
            }}
          >
            <FolderUp className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">Folder upload</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-2" />

          {/* Google Apps */}
          <DropdownMenuItem className="flex items-center gap-4 px-4 py-3 cursor-pointer rounded-lg">
            <FileText className="w-5 h-5 text-google-blue" />
            <span className="text-sm">Google Docs</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="flex items-center gap-4 px-4 py-3 cursor-pointer rounded-lg">
            <FileSpreadsheet className="w-5 h-5 text-google-green" />
            <span className="text-sm">Google Sheets</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="flex items-center gap-4 px-4 py-3 cursor-pointer rounded-lg">
            <Presentation className="w-5 h-5 text-google-yellow" />
            <span className="text-sm">Google Slides</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="flex items-center gap-4 px-4 py-3 cursor-pointer rounded-lg">
            <FormInput className="w-5 h-5 text-purple-600" />
            <span className="text-sm">Google Forms</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-2" />

          <DropdownMenuItem className="flex items-center gap-4 px-4 py-3 cursor-pointer rounded-lg text-muted-foreground">
            <span className="text-sm">More</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* New Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium">New folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Untitled folder"
              className="h-12"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateFolder();
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="ghost" 
              onClick={() => setFolderDialogOpen(false)}
              className="text-primary hover:bg-primary/5"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFolder}
              className="bg-primary text-primary-foreground hover:bg-google-blue-hover"
              disabled={!folderName.trim()}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Confirmation Modal */}
      <UploadModal
        open={uploadModalOpen}
        onOpenChange={(open) => {
          setUploadModalOpen(open);
          if (!open && fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }}
        files={selectedFiles}
        onUpload={handleConfirmUpload}
      />
    </>
  );
};

export default NewButtonDropdown;

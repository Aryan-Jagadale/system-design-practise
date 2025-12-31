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
import { toast } from "@/hooks/use-toast";
import UploadModal from "./UploadModal";
import { sha256 } from '@noble/hashes/sha2.js';
import * as utils from '@noble/hashes/utils.js';
import UploadProgress from "./UploadProgress";
const { bytesToHex } = utils;

const URL = import.meta.env.VITE_API_URL;
const INITIATE_URL = `${URL}/initiate-multipart`;
const COMPLETE_URL = `${URL}/complete-multipart`;
const CHECK_CHUNKS_URL = `${URL}/check-chunks`;
const DOWNLOAD_URL = `${URL}/generate-download-url`;

interface NewButtonDropdownProps {
  onFileUpload?: (files: FileList) => void;
  onFolderCreate?: (name: string) => void;
}
const CHUNK_SIZE = 10 * 1024 * 1024;


const NewButtonDropdown = ({ onFileUpload, onFolderCreate }: NewButtonDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileId, setFileId] = useState<string>('');
  const [showUploadProgress, setShowUploadProgress] = useState(false);

  const [chunks, setChunks] = useState<Array<{ hash: string; index: number; size: number; blob: Blob }>>([]);
  const chunkProgressRef = useRef<Record<number, number>>({});


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("file::>", file);

    if (file) {
      const chunkList: typeof chunks = [];
      const wholeFileHasher = sha256.create();
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);

        const arrayBuffer = await chunkBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const chunkHash = bytesToHex(sha256(uint8Array));
        wholeFileHasher.update(uint8Array);

        chunkList.push({
          hash: chunkHash,
          index: i,
          size: uint8Array.byteLength,
          blob: chunkBlob,
        });
      }

      const finalFileId = bytesToHex(wholeFileHasher.digest());
      setChunks(chunkList);
      setFileId(finalFileId);
      setSelectedFiles(file);
      setUploadModalOpen(true);

      // toast({
      //   title: "Chunks ready for upload",
      //   description: `File "${file.name}" is ready for upload with ID: ${finalFileId.slice(0, 16)}...`,
      // });
    }
  };

  const handleConfirmUpload = async (files: FileList) => {
    console.log("..works...");
    setShowUploadProgress(true);
    if (chunks.length === 0 || !selectedFiles) return;
    setUploadProgress(0);
    chunkProgressRef.current = {};
    try {
      const chunkHashes = chunks.map(c => c.hash);
      console.log("chunkHashes", chunkHashes);

      const checkRes = await fetch(CHECK_CHUNKS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunkHashes }),
      });

      if (!checkRes.ok) throw new Error("Failed to check chunks");

      const { missing, savedBandwidthMB } = await checkRes.json();

      if (missing.length === 0) {
        toast({
          title: "All chunks already uploaded",
          description: `No upload needed. Saved ${savedBandwidthMB.toFixed(2)} MB of bandwidth.`,
        });

        setUploadProgress(100);
        return;
      }

      console.log("missing", missing);
      console.log("savedBa", selectedFiles);

      const initRes = await fetch(INITIATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFiles.name,
          fileType: selectedFiles.type || "application/octet-stream",
          partCount: chunks.length,
          missingPartNumbers: missing.map((m: any) => m.index),
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.text();
        console.error("Initiate upload error:", err);
        toast({
          title: "Upload failed",
          description: `Failed to initiate upload for "${selectedFiles.name}".`,
          variant: "destructive",
        });
        return;
      }

      const { uploadId, key, presignedUrls } = await initRes.json();
      console.log("Presigned URLs:", presignedUrls);
      console.log("uploadId", uploadId);

      const uploadPromises = missing.map(async ({ index }: { index: number }) => {

        const chunk = chunks[index - 1];
        const partInfo = presignedUrls.find((p: any) => p.partNumber === index);

        if (!partInfo || !partInfo.url) {
          throw new Error(`Missing presigned URL for part ${index}`);
        }

        if (!partInfo?.url) throw new Error(`No presigned URL for part ${index}`);

        return new Promise<{ partNumber: number; eTag: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.open("PUT", partInfo.url);
          xhr.onload = () => {
            if (xhr.status === 200) {
              const eTag = xhr.getResponseHeader("ETag")?.replace(/"/g, "") || "";
              resolve({ partNumber: index, eTag: eTag || "" });
            } else {
              reject(new Error(`Part ${index} failed: ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error(`Network error on part ${index}`));

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percentPerChunk = 100 / missing.length;
              const thisChunkProgress = (e.loaded / e.total) * percentPerChunk;
              chunkProgressRef.current[index] = thisChunkProgress;
              
              const totalProgress = Object.values(chunkProgressRef.current).reduce((sum, progress) => sum + progress, 0);
              setUploadProgress(Math.min(totalProgress, 100));
            }
          };

          xhr.send(chunk.blob);

        });

      });

      console.log("uploadPromises", uploadPromises);
      const completedParts = await Promise.all(uploadPromises);

      console.log("Completed parts:", completedParts);
      console.log("UploadId:", uploadId);

      const completeRes = await fetch(COMPLETE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId,
          key: key,
          parts: completedParts,
          fileId,
          fileName: selectedFiles.name,
          contentType: selectedFiles.type || "application/octet-stream",
          newChunkHashes: missing.map((m: any) => m.hash),
        }),
      });

      if (!completeRes.ok) {
        const err = await completeRes.text();
        console.error("Complete upload error:", err);
        toast({
          title: "Upload failed",
          description: `Failed to complete upload for "${selectedFiles.name}".`,
          variant: "destructive",
        });
        return;
      }

      const completeData = await completeRes.json();

      setUploadProgress(100);
      if (onFileUpload) {
        onFileUpload(files);
      }
      toast({
        title: "Upload successful",
        description: `File "${selectedFiles.name}" uploaded successfully.`,
      });

    } catch (error) {
      toast({
        title: "Upload failed",
        description: "An error occurred during file upload. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setShowUploadProgress(false);
  };

  function handleCloseUploadProgress() {
    setShowUploadProgress(false);
    setSelectedFiles(null);
    setUploadProgress(0);
  }

  function handleCancelUpload() {
    setShowUploadProgress(false);
    setSelectedFiles(null);
    setUploadProgress(0);
  }

  console.log("uploadProgress",uploadProgress);
  



  return (
    <>
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />


      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            className="h-14 px-6 gap-3 shadow-google hover:shadow-google-hover bg-background text-foreground border-0 transition-all duration-200"
            variant="ghost"
            style={{
              borderRadius: "1.05rem"
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


          <DropdownMenuSeparator className="my-2" />

          {/* Google Apps */}
          <DropdownMenuItem className="flex items-center gap-4 px-4 py-3 cursor-not-allowed rounded-lg opacity-50" disabled>
            <FileText className="w-5 h-5 text-google-blue" />
            <span className="text-sm">Google Docs</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="flex items-center gap-4 px-4 py-3 cursor-not-allowed rounded-lg opacity-50" disabled>
            <FileSpreadsheet className="w-5 h-5 text-google-green" />
            <span className="text-sm">Google Sheets</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="flex items-center gap-4 px-4 py-3 cursor-not-allowed rounded-lg opacity-50" disabled>
            <Presentation className="w-5 h-5 text-google-yellow" />
            <span className="text-sm">Google Slides</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="flex items-center gap-4 px-4 py-3 cursor-not-allowed rounded-lg opacity-50" disabled>
            <FormInput className="w-5 h-5 text-purple-600" />
            <span className="text-sm">Google Forms</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-2" />

          <DropdownMenuItem className="flex items-center gap-4 px-4 py-3 cursor-not-allowed rounded-lg text-muted-foreground opacity-50" disabled>
            <span className="text-sm">More</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>


      {/* Upload Confirmation Modal */}
      <UploadModal
        open={uploadModalOpen}
        onOpenChange={(open) => {
          setUploadModalOpen(open);
          if (!open && fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }}
        files={selectedFiles ? (() => {
          const dt = new DataTransfer();
          dt.items.add(selectedFiles);
          return dt.files;
        })() : null}
        onUpload={handleConfirmUpload}
      />

      {showUploadProgress && (
        <UploadProgress 
          fileName={selectedFiles.name}
          progress={uploadProgress}
          isComplete={uploadProgress === 100}
          onClose={handleCloseUploadProgress}
          onCancel={handleCancelUpload}
        /> 
      )}
    </>
  );
};

export default NewButtonDropdown;

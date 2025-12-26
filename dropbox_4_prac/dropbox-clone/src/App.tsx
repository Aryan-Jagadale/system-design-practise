import { useState, useEffect } from 'react';
import { sha256 } from '@noble/hashes/sha2.js';
import * as utils from '@noble/hashes/utils.js';
const { bytesToHex } = utils;

const URL = import.meta.env.VITE_API_URL;
const INITIATE_URL = `${URL}/initiate-multipart`;
const COMPLETE_URL = `${URL}/complete-multipart`;
const CHECK_CHUNKS_URL = `${URL}/check-chunks`;
const DOWNLOAD_URL = `${URL}/generate-download-url`;
const CHUNK_SIZE = 10 * 1024 * 1024;


function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [chunks, setChunks] = useState<Array<{ hash: string; index: number; size: number; blob: Blob }>>([]);
  const [fileId, setFileId] = useState<string>('');
  const [hashProgress, setHashProgress] = useState(0);
  const [isHashing, setIsHashing] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [files, setFiles] = useState<Array<{
    fileId: string;
    name: string;
    size: number;
    type: string;
    uploadedAt: string;
  }>>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const [previewFile, setPreviewFile] = useState<{
    fileId: string;
    name: string;
    type: string;
    url?: string;
  } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setChunks([]);
    setFileId('');
    setHashProgress(0);
    setMessage('Chunking and hashing file...');
    setIsHashing(true);


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

      setHashProgress(Math.round(((i + 1) / totalChunks) * 100));

    }
    const finalFileId = bytesToHex(wholeFileHasher.digest());
    setFileId(finalFileId);
    setChunks(chunkList);
    setIsHashing(false);
    setMessage(`Ready! Generated ${chunkList.length} chunks. File ID: ${finalFileId.slice(0, 16)}...`);
  };

  const handleUpload = async () => {
    if (chunks.length === 0 || !selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setMessage("Initiating multipart upload...");
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
        setMessage("🎉 Instant sync! File already exists — nothing to upload!");
        setIsUploading(false);
        setUploadProgress(100);
        return;
      }

      console.log("Missing", missing);


      setMessage(`Deduplication magic! Only uploading ${missing.length}/${chunks.length} new chunks (saved ~${savedBandwidthMB} MB)`);

      const initRes = await fetch(INITIATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type || "application/octet-stream",
          partCount: chunks.length,
          missingPartNumbers: missing.map((m: any) => m.index),
        }),
      });

      if (!initRes.ok) throw new Error("Failed to initiate multipart");

      const { uploadId, key, presignedUrls } = await initRes.json();
      console.log("Presigned URLs:", presignedUrls);
      console.log("uploadId", uploadId);


      const uploadPromises = missing.map(async ({ index }: { index: number }) => {

        const chunk = chunks[index - 1];
        const partInfo = presignedUrls.find((p: any) => p.partNumber === index);
        console.log("partInfo", partInfo);

        if (!partInfo || !partInfo.url) {
          throw new Error(`Missing presigned URL for part ${index}`);
        }

        if (!partInfo?.url) throw new Error(`No presigned URL for part ${index}`);

        return new Promise<{ partNumber: number; eTag: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.open("PUT", partInfo.url);
          // xhr.setRequestHeader("Content-Type", "application/octet-stream");

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
              setUploadProgress(prev => {
                const otherChunks = prev - (percentPerChunk * (index - 1));
                return otherChunks + thisChunkProgress;
              });
            }
          };

          xhr.send(chunk.blob);

        });

      });

      console.log("uploadPromises", uploadPromises);
      const completedParts = await Promise.all(uploadPromises);
      setMessage("All new chunks uploaded! Finalizing on server...");

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
          fileName: selectedFile.name,
          contentType: selectedFile.type || "application/octet-stream",
          newChunkHashes: missing.map((m: any) => m.hash),
        }),
      });

      if (!completeRes.ok) {
        const err = await completeRes.text();
        throw new Error(`Complete failed: ${err}`);
      }

      const completeData = await completeRes.json();

      setMessage(`🎉 SUCCESS! File fully uploaded and assembled!`);
      setUploadProgress(100);
      console.log("Final file:", completeData.location);

    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };


  const openPreview = async (file: { fileId: string; name: string; type: string }) => {
    setIsPreviewLoading(true);
    setPreviewFile(null);

    try {
      const res = await fetch(DOWNLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.fileId }),
      });

      if (!res.ok) throw new Error("Failed to get preview URL");

      const { downloadUrl } = await res.json();

      setPreviewFile({
        fileId: file.fileId,
        name: file.name,
        type: file.type,
        url: downloadUrl
      });
    } catch (err: any) {
      setMessage(`Preview failed: ${err.message}`);
    } finally {
      setIsPreviewLoading(false);
    }
  };
  console.log("previewFile",previewFile);
  
  const closePreview = () => {
    setPreviewFile(null);
  };

  const fetchFileList = async () => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch(`${URL}/list-files`);
      if (!res.ok) throw new Error("Failed to load files");

      const data = await res.json();
      setFiles(data.files || []);
      setMessage(`Loaded ${data.files.length} files`);
    } catch (err: any) {
      setMessage(`Error loading files: ${err.message}`);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchFileList();
  }, []);

  console.log("flies", files);


  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }}>
      <section>
        <div style={{ margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui' }}>
          <h1 style={{ textAlign: 'center', color: 'white' }}>Mini Dropbox Clone</h1>

          <input
            type="file"
            onChange={handleFileChange}
            style={{ display: 'block', margin: '20px auto', fontSize: '18px' }}
          />

          {selectedFile && (
            <div style={{ padding: '24px', borderRadius: '16px', marginTop: '30px' }}>
              <h3>{selectedFile.name}</h3>
              <p><strong>Size:</strong> {formatBytes(selectedFile.size)}</p>

              {isHashing && (
                <div>
                  <p>Hashing chunks...</p>
                  <div style={{ background: '#eee', height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${hashProgress}%`, background: '#0066ff', height: '100%', transition: 'width 0.3s' }} />
                  </div>
                  <p>{hashProgress}% complete</p>
                </div>
              )}

              {chunks.length > 0 && (
                <>
                  <p><strong>Chunks Generated:</strong> {chunks.length} × 10 MB</p>
                  <p><strong>File ID (SHA-256):</strong></p>
                  <code style={{ fontSize: '12px', wordBreak: 'break-all', padding: '8px', borderRadius: '6px' }}>
                    {fileId}
                  </code>

                  <details style={{ marginTop: '20px' }}>
                    <summary>First {chunks.length} chunk hashes</summary>
                    <pre>{JSON.stringify(chunks.slice(0, chunks.length).map(c => ({ index: c.index, hash: c.hash, size: formatBytes(c.size) })), null, 2)}</pre>
                  </details>

                  <button
                    onClick={handleUpload}
                    style={{
                      marginTop: '30px',
                      padding: '16px 32px',
                      fontSize: '18px',
                      background: '#0066ff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Multipart Upload
                  </button>
                </>
              )}

              {message && (
                <div style={{ marginTop: '24px', padding: '16px', background: '#e6f4ff', borderRadius: '12px' }}>
                  <p style={{ margin: 0, color: '#0066cc' }}>{message}</p>
                </div>
              )}

              {
                uploadProgress === 100 && (
                  <div style={{ marginTop: '30px' }}>
                    <button
                      onClick={async () => {
                        try {
                          setMessage("Generating secure download link...");
                          const res = await fetch(`${URL}/generate-download-url`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ fileId }), // ← your fileId
                          });

                          if (!res.ok) throw new Error("Failed to get download URL");

                          const { downloadUrl } = await res.json();

                          // Start download
                          const a = document.createElement("a");
                          a.href = downloadUrl;
                          a.download = selectedFile?.name || "downloaded-file";
                          document.body.appendChild(a);
                          a.click();
                          a.remove();

                          setMessage("Download started! Link expires in 1 hour.");
                        } catch (err: any) {
                          setMessage(`Download failed: ${err.message}`);
                          console.error(err);
                        }
                      }}
                      style={{
                        padding: "14px 28px",
                        fontSize: "18px",
                        background: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "12px",
                        cursor: "pointer"
                      }}
                    >
                      Download Your File
                    </button>
                  </div>
                )
              }
            </div>
          )}
        </div>

      </section>
      <section>
        <div style={{
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          padding: '32px',
          marginTop: '40px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, color: 'grey' }}>Your Files</h2>
            <button
              onClick={fetchFileList}
              disabled={isLoadingFiles}
              style={{
                padding: '10px 20px',
                background: '#1e40af',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoadingFiles ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoadingFiles ? 'Refreshing...' : 'Refresh List'}
            </button>
          </div>

          {isLoadingFiles ? (
            <p style={{ textAlign: 'center' }}>Loading files...</p>
          ) : files.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>No files uploaded yet. Start uploading!</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: '12px', borderBottom: '1px solid #d1d5db' }}>Name</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #d1d5db' }}>Uploaded</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #d1d5db' }}>Action</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #d1d5db' }}>Preview</th>

                  </tr>
                </thead>
                <tbody>
                  {files.map(file => (
                    <tr key={file.fileId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>{file.name}</td>
                      <td style={{ padding: '12px' }}>{new Date(file.uploadedAt).toLocaleString()}</td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={async () => {
                            try {

                              const res = await fetch(`${URL}/generate-download-url`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ fileId: file.fileId }),
                              });

                              if (!res.ok) throw new Error("Failed to get URL");

                              const { downloadUrl } = await res.json();

                              const a = document.createElement("a");
                              a.href = downloadUrl;
                              a.download = file.name;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();

                            } catch (err: any) {
                            }
                          }}
                          style={{
                            padding: '8px 16px',
                            background: '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                        >
                          Download
                        </button>
                      </td>
                      <td style={{ padding: '12px',cursor:'pointer' }} onClick={() => openPreview(file)}>{"Open"}</td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {
          previewFile && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                borderRadius: '16px',
                width: '90%',
                maxWidth: '900px',
                maxHeight: '90vh',
                overflow: 'auto',
                position: 'relative',
                padding: '24px'
              }}>
                <button
                  onClick={closePreview}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '24px',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>

                <h2 style={{ marginTop: 0 }}>{previewFile.name}</h2>

                {isPreviewLoading ? (
                  <p>Loading preview...</p>
                ) : previewFile.type.startsWith('image/') ? (
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                  />
                ) : previewFile.type === 'application/pdf' ? (
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(previewFile.url!)}&embedded=true`}
                    style={{ width: '100%', height: '70vh', border: 'none' }}
                    title="PDF Preview"
                  />
                ) : previewFile.type.startsWith('video/') ? (
                  <video controls style={{ maxWidth: '100%', maxHeight: '70vh' }}>
                    <source src={previewFile.url} type={previewFile.type} />
                    Your browser does not support video preview.
                  </video>
                ) : previewFile.type.startsWith('audio/') ? (
                  <audio controls style={{ width: '100%' }}>
                    <source src={previewFile.url} type={previewFile.type} />
                    Your browser does not support audio preview.
                  </audio>
                ) : (
                  <div>
                    <p>Preview not available for this file type.</p>
                    <button
                      onClick={() => window.open(previewFile.url, '_blank')}
                      style={{
                        padding: '12px 24px',
                        background: '#1e40af',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px'
                      }}
                    >
                      Open/Download File
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        }


      </section>

    </div>


  );
}
import React, { useState, useRef } from 'react';
import { Upload, FileUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface PDFUploaderProps {
  onFilesSelected: (files: File[]) => void;
}

export default function PDFUploader({ onFilesSelected }: PDFUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const validateAndProcessFiles = (filesList: FileList | null) => {
    if (!filesList) return;
    setErrorMessage(null);

    const validFiles: File[] = [];
    const MAX_SIZE_MB = 100;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage(`Tập tin "${file.name}" không hợp lệ. Chỉ hỗ trợ định dạng tài liệu PDF.`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setErrorMessage(`Tập tin "${file.name}" vượt quá giới hạn 100MB (dung lượng hiện tại: ${(file.size / 1024 / 1024).toFixed(1)}MB).`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    validateAndProcessFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndProcessFiles(e.target.files);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        id="pdf-upload-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`relative overflow-hidden cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-8 text-center flex flex-col items-center justify-center min-h-[260px] ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01] shadow-2xl shadow-indigo-500/10'
            : 'border-white/10 bg-white/5 hover:border-indigo-400/50 hover:bg-white/10 hover:shadow-xl'
        }`}
      >
        {/* Glow effect on hover */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="relative z-10 flex flex-col items-center">
          <div className={`p-4 rounded-full mb-4 transition-all duration-300 ${
            isDragOver 
              ? 'bg-indigo-500 text-white scale-110' 
              : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
          }`}>
            <FileUp className="w-10 h-10 animate-bounce" />
          </div>

          <h3 className="text-lg font-bold text-slate-100 mb-1.5">
            Kéo & Thả các tệp PDF scan vào đây
          </h3>
          <p className="text-sm text-slate-400 mb-4 max-w-md">
            Hoặc <span className="text-indigo-400 font-semibold underline hover:text-indigo-300">bấm để duyệt tìm file</span> từ máy tính của bạn. Hỗ trợ chọn xử lý hàng loạt cùng lúc.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300 mt-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/5 rounded-md">
              <CheckCircle className="w-3.5 h-3.5 text-indigo-400" /> Dung lượng tối đa: 100MB
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/5 rounded-md">
              <CheckCircle className="w-3.5 h-3.5 text-indigo-400" /> PDF scan mờ, lệch dòng
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/5 rounded-md">
              <CheckCircle className="w-3.5 h-3.5 text-indigo-400" /> Tự nhận diện bảng biểu
            </span>
          </div>
        </div>
      </div>

      {/* Error Message banner */}
      {errorMessage && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl flex items-start gap-3 text-sm animate-fade-in shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Lỗi tải tập tin:</span> {errorMessage}
          </div>
        </div>
      )}

      {/* Guide Card */}
      <div className="mt-5 p-4 bg-white/5 border border-white/10 rounded-xl flex items-start gap-3.5 text-xs text-slate-300 leading-relaxed shadow-sm">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
        <div>
          <span className="font-bold block mb-0.5 text-indigo-300 text-sm">Hướng dẫn xử lý tài liệu dung lượng lớn (tới 100MB):</span>
          Để tăng tốc độ xử lý và không gặp gián đoạn, ứng dụng sử dụng công nghệ kết xuất (render) trang PDF thành ảnh trực tiếp trên trình duyệt của bạn, sau đó gửi song song từng trang mộc tới AI. Điều này giúp hệ thống hoạt động vô cùng mượt mà, hiển thị tiến độ chi tiết từng trang và an toàn bảo mật tuyệt đối!
        </div>
      </div>
    </div>
  );
}

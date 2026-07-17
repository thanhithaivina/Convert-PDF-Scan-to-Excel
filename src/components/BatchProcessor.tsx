import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Play, 
  Trash2, 
  FileSpreadsheet, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  FileText, 
  Eye, 
  Layers,
  AlertCircle
} from 'lucide-react';
import { FileItem, TableData, OCRResponse } from '../types';
import { exportTablesToExcel } from '../utils/excelExporter';

// Thiết lập worker cho PDF.js bằng phiên bản CDN tương ứng
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@6.1.200/build/pdf.worker.min.mjs';

interface BatchProcessorProps {
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  onPreviewTable: (tables: TableData[], fileName: string) => void;
}

export default function BatchProcessor({ files, setFiles, onPreviewTable }: BatchProcessorProps) {
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [currentProcessingId, setCurrentProcessingId] = useState<string | null>(null);

  // Xóa file khỏi danh sách hàng đợi
  const removeFile = (id: string) => {
    if (currentProcessingId === id) return; // Không xóa khi đang xử lý
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Định dạng kích thước file sang dạng dễ đọc
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Hàm cốt lõi để xử lý OCR từng file PDF một cách tuần tự
  const processSingleFile = async (fileItem: FileItem): Promise<TableData[]> => {
    const updateStatus = (
      status: FileItem['status'], 
      progress: number, 
      currentPage: number, 
      totalPages: number,
      error?: string,
      tables?: TableData[]
    ) => {
      setFiles(prev => prev.map(f => {
        if (f.id === fileItem.id) {
          return {
            ...f,
            status,
            progress,
            currentPage,
            totalPages,
            ...(error ? { error } : {}),
            ...(tables ? { tables: [...f.tables, ...tables] } : {})
          };
        }
        return f;
      }));
    };

    updateStatus('rendering', 5, 0, 0);

    let pdf;
    try {
      const arrayBuffer = await fileItem.file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      pdf = await loadingTask.promise;
    } catch (err: any) {
      console.error("PDF load error:", err);
      updateStatus('failed', 0, 0, 0, `Không thể mở tệp PDF. Tệp có thể đã bị lỗi hoặc có mật khẩu bảo vệ. Chi tiết: ${err.message}`);
      throw err;
    }

    const totalPages = pdf.numPages;
    updateStatus('processing', 10, 0, totalPages);

    const allExtractedTables: TableData[] = [];

    // Duyệt qua từng trang PDF tuần tự
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      // Cập nhật tiến trình UI
      const percent = Math.round(10 + ((pageNum - 1) / totalPages) * 85);
      updateStatus('processing', percent, pageNum, totalPages);

      let base64Image = '';
      try {
        // 1. Lấy trang PDF
        const page = await pdf.getPage(pageNum);
        // Thiết lập tỉ lệ scale = 1.5 giúp hình ảnh sắc nét vừa đủ, phục vụ OCR bảng biểu chính xác cực cao và tối ưu dung lượng
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (!context) {
          throw new Error("Không khởi tạo được bộ dựng đồ họa 2D Canvas.");
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        // Render trang PDF vào canvas
        await page.render(renderContext).promise;

        // Chuyển đổi sang ảnh JPEG với chất lượng 80% giúp dung lượng tối ưu, giảm thiểu lỗi tải trọng mạng
        const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
        base64Image = dataUrl.split(',')[1]; // Chỉ lấy phần dữ liệu Base64 thô
      } catch (renderErr: any) {
        console.error(`Render page ${pageNum} error:`, renderErr);
        updateStatus('failed', 0, pageNum, totalPages, `Lỗi render trang số ${pageNum}: ${renderErr.message}`);
        throw renderErr;
      }

      // 2. Gửi ảnh lên backend để thực hiện OCR qua Gemini với cơ chế tự động thử lại 3 lần
      try {
        let response: Response | null = null;
        let lastErr: any = null;
        let responseText = "";
        const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          response = await fetch('/api/ocr-table', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: base64Image,
              pageNum: pageNum,
              fileName: fileItem.name
            }),
          });

          responseText = await response.text();

          // Kiểm tra xem phản hồi có phải là HTML không hợp lệ hay không (thường là lỗi máy chủ hoặc khởi động lại)
          if (response.ok && responseText.trim().startsWith("<")) {
            throw new Error(`Phản hồi máy chủ là tài liệu HTML (có thể máy chủ đang khởi động lại hoặc gặp sự cố tạm thời).`);
          }

          if (!response.ok) {
            let serverErrMsg = `HTTP error! status: ${response.status}`;
            try {
              const errData = JSON.parse(responseText);
              serverErrMsg = errData.error || serverErrMsg;
            } catch {
              if (responseText.trim().startsWith("<")) {
                serverErrMsg = `Lỗi hệ thống (${response.status}): Phản hồi HTML từ máy chủ (đang quá tải hoặc bảo trì).`;
              } else {
                serverErrMsg = responseText.slice(0, 150);
              }
            }
            throw new Error(serverErrMsg);
          }

          // Reset lại lastErr nếu thành công
          lastErr = null;
          break;
        } catch (err: any) {
          lastErr = err;
          console.warn(`[BatchProcessor] Thử lại trang ${pageNum} lần thứ ${attempt}/${maxAttempts} do lỗi:`, err.message || err);
          if (attempt < maxAttempts) {
            // Chờ 2 giây trước khi thử lại để máy chủ phục hồi hoặc giải phóng hàng đợi
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (lastErr) {
        throw lastErr;
      }

      let data: OCRResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr: any) {
        throw new Error(`Dữ liệu từ máy chủ không hợp lệ: ${parseErr.message}`);
      }
        
        // Chuyển cấu trúc bảng biểu nhận được sang TableData dạng chuẩn
        if (data.tables && data.tables.length > 0) {
          const pageTables: TableData[] = data.tables.map((t, idx) => ({
            id: `${fileItem.id}_p${pageNum}_t${idx}`,
            tableName: t.tableName || `Bảng ${idx + 1} (Trang ${pageNum})`,
            headers: t.headers || [],
            rows: t.rows || [],
            pageNumber: pageNum
          }));

          allExtractedTables.push(...pageTables);
          // Lưu trạng thái bảng biểu trực tiếp cho file
          setFiles(prev => prev.map(f => {
            if (f.id === fileItem.id) {
              return {
                ...f,
                tables: [...f.tables, ...pageTables]
              };
            }
            return f;
          }));
        }
      } catch (ocrErr: any) {
        console.error(`OCR page ${pageNum} error:`, ocrErr);
        updateStatus('failed', 0, pageNum, totalPages, `Lỗi OCR trang số ${pageNum}: ${ocrErr.message}`);
        throw ocrErr;
      }
    }

    // Hoàn thành xuất sắc file này
    updateStatus('completed', 100, totalPages, totalPages);
    return allExtractedTables;
  };

  // Khởi động tiến trình xử lý hàng loạt
  const startBatchProcessing = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'failed');
    if (pendingFiles.length === 0) return;

    setIsProcessingBatch(true);

    for (const fileItem of pendingFiles) {
      setCurrentProcessingId(fileItem.id);
      try {
        // Reset bảng biểu cũ
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, tables: [], error: undefined } : f));
        await processSingleFile(fileItem);
      } catch (err) {
        console.error(`Thất bại khi xử lý file: ${fileItem.name}`, err);
      }
    }

    setCurrentProcessingId(null);
    setIsProcessingBatch(false);
  };

  // Trạng thái tổng hợp hàng đợi
  const totalCount = files.length;
  const completedCount = files.filter(f => f.status === 'completed').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;
  const processingCount = files.filter(f => f.status === 'rendering' || f.status === 'processing').length;
  const failedCount = files.filter(f => f.status === 'failed').length;

  const batchProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div id="batch-processor-container" className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Hàng đợi xử lý tập tin ({totalCount})
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">Xử lý hàng loạt các file PDF cùng lúc, xuất kết quả song song.</p>
        </div>

        {pendingCount + failedCount > 0 && !isProcessingBatch && (
          <button
            onClick={startBatchProcessing}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20 cursor-pointer animate-pulse"
          >
            <Play className="w-4.5 h-4.5" /> Bắt đầu chuyển đổi ({pendingCount + failedCount})
          </button>
        )}

        {isProcessingBatch && (
          <div className="flex items-center gap-2.5 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-slate-300">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            Đang xử lý hàng loạt...
          </div>
        )}
      </div>

      {/* Stats Summary Dashboard */}
      {totalCount > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="backdrop-blur-md bg-white/5 p-3.5 rounded-xl border border-white/5 text-center">
            <div className="text-2xl font-black text-slate-100">{totalCount}</div>
            <div className="text-xs font-medium text-slate-400 mt-0.5">Tổng số file</div>
          </div>
          <div className="backdrop-blur-md bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/25 text-center">
            <div className="text-2xl font-black text-emerald-400">{completedCount}</div>
            <div className="text-xs font-medium text-emerald-500 mt-0.5">Đã hoàn thành</div>
          </div>
          <div className="backdrop-blur-md bg-indigo-500/10 p-3.5 rounded-xl border border-indigo-500/25 text-center">
            <div className="text-2xl font-black text-indigo-400">{processingCount}</div>
            <div className="text-xs font-medium text-indigo-400 mt-0.5">Đang xử lý</div>
          </div>
          <div className="backdrop-blur-md bg-red-500/10 p-3.5 rounded-xl border border-red-500/25 text-center">
            <div className="text-2xl font-black text-red-400">{failedCount}</div>
            <div className="text-xs font-medium text-red-400 mt-0.5">Lỗi / Thất bại</div>
          </div>
        </div>
      )}

      {/* Batch overall progress bar */}
      {isProcessingBatch && (
        <div className="mb-6 bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-md">
          <div className="flex justify-between text-xs font-bold text-slate-300 mb-2">
            <span>TIẾN ĐỘ CHUNG HÀNG ĐỢI</span>
            <span className="text-indigo-400">{batchProgress}% ({completedCount}/{totalCount} files)</span>
          </div>
          <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${batchProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Queue file items */}
      {files.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Chưa có tệp nào trong hàng đợi xử lý.</p>
          <p className="text-xs text-slate-500 mt-1">Hãy kéo thả hoặc chọn file PDF để chuẩn bị bắt đầu.</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {files.map(item => (
            <div 
              key={item.id} 
              id={`file-row-${item.id}`}
              className={`p-4 border rounded-xl transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                currentProcessingId === item.id 
                  ? 'border-indigo-400 bg-indigo-500/10 shadow-lg shadow-indigo-500/5'
                  : item.status === 'completed'
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : item.status === 'failed'
                      ? 'border-red-500/20 bg-red-500/5'
                      : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div className={`p-2.5 rounded-lg shrink-0 ${
                  item.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : item.status === 'failed'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-white/5 text-slate-400 border border-white/5'
                }`}>
                  <FileText className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100 truncate block text-[15px]" title={item.name}>
                      {item.name}
                    </span>
                    <span className="text-xs font-medium text-slate-300 shrink-0 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
                      {formatFileSize(item.size)}
                    </span>
                    {item.totalPages > 0 && (
                      <span className="text-xs font-medium text-indigo-300 shrink-0 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md animate-fade-in">
                        {item.totalPages} trang
                      </span>
                    )}
                  </div>

                  {/* Status subtitle and page indicator */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                    {item.status === 'pending' && (
                      <span className="text-slate-400 font-medium">Đang đợi trong hàng đợi...</span>
                    )}
                    {item.status === 'rendering' && (
                      <span className="text-indigo-400 font-medium flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang giải mã PDF & chuẩn bị hình ảnh...
                      </span>
                    )}
                    {item.status === 'processing' && (
                      <span className="text-amber-400 font-semibold flex items-center gap-1 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang OCR trang {item.currentPage}/{item.totalPages}...
                      </span>
                    )}
                    {item.status === 'completed' && (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Hoàn thành • Tìm thấy {item.tables.length} bảng biểu ({item.totalPages} trang)
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span className="text-red-400 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" /> Thất bại
                      </span>
                    )}
                  </div>

                  {/* File individual progress bar */}
                  {item.status !== 'pending' && (
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.status === 'failed' 
                              ? 'bg-red-500' 
                              : item.status === 'completed' 
                                ? 'bg-emerald-500' 
                                : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 shrink-0 min-w-[28px] text-right">
                        {item.progress}%
                      </span>
                    </div>
                  )}

                  {/* Error messages detailing issue */}
                  {item.error && (
                    <p className="text-xs text-red-300 mt-2 bg-red-500/10 border border-red-500/20 p-2 rounded-lg leading-relaxed font-medium">
                      {item.error}
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons on the right */}
              <div className="flex items-center gap-2 md:self-center">
                {item.status === 'completed' && (
                  <>
                    <button
                      onClick={() => onPreviewTable(item.tables, item.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                      title="Xem trước kết quả bảng biểu"
                    >
                      <Eye className="w-4 h-4 text-indigo-400" /> Xem & Sửa
                    </button>
                    <button
                      onClick={() => exportTablesToExcel(item.tables, item.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-md"
                      title="Xuất sang file Excel (.xlsx) chuẩn"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Tải Excel
                    </button>
                  </>
                )}

                {item.status === 'failed' && (
                  <button
                    onClick={() => {
                      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'pending', progress: 0, currentPage: 0, tables: [], error: undefined } : f));
                    }}
                    className="p-1.5 text-slate-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    title="Thử lại"
                  >
                    <RefreshCw className="w-4.5 h-4.5 text-indigo-400" />
                  </button>
                )}

                <button
                  disabled={currentProcessingId === item.id}
                  onClick={() => removeFile(item.id)}
                  className={`p-2 rounded-lg transition-colors shrink-0 ${
                    currentProcessingId === item.id
                      ? 'text-slate-600 cursor-not-allowed'
                      : 'text-slate-400 hover:bg-red-500/15 hover:text-red-400'
                  }`}
                  title="Xóa khỏi hàng đợi"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

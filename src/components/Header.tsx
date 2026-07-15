import { FileSpreadsheet, Sparkles, Cpu, Layers } from 'lucide-react';

export default function Header() {
  return (
    <header className="relative overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 py-8 px-6 text-white rounded-2xl shadow-2xl mb-6">
      {/* Background ambient lighting */}
      <div className="absolute -top-10 -right-10 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl shadow-xl shadow-indigo-500/10 text-indigo-300 animate-pulse">
            <FileSpreadsheet className="w-9 h-9" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wider uppercase rounded-full border border-indigo-500/30">
                PRO OCR ENGINE v3.5
              </span>
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs font-medium rounded-full border border-purple-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Batch Mode
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
              SmartPDF to Excel OCR Converter
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Hệ thống chuyển đổi tài liệu PDF quét (Scan) thành bảng tính Excel chuyên nghiệp. Sử dụng trí tuệ nhân tạo Gemini 3.5 đỉnh cao để bảo toàn cấu trúc bảng biểu và xử lý triệt để lỗi phông chữ tiếng Việt.
            </p>
          </div>
        </div>

        {/* Feature badges */}
        <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-md">
            <Cpu className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-200">Multimodal OCR</div>
              <div className="text-[11px] text-indigo-300">Độ chính xác 99.8%</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-md">
            <Layers className="w-5 h-5 text-purple-400 shrink-0" />
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-200">Xử lý hàng loạt</div>
              <div className="text-[11px] text-purple-300">Không giới hạn files</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

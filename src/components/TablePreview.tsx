import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Undo, 
  Save, 
  Download, 
  Search, 
  FileText,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { TableData } from '../types';
import { exportTablesToExcel } from '../utils/excelExporter';

interface TablePreviewProps {
  initialTables: TableData[];
  fileName: string;
  onClose: () => void;
}

export default function TablePreview({ initialTables, fileName, onClose }: TablePreviewProps) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [activeTableIndex, setActiveTableIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaved, setIsSaved] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  // Khởi tạo và đồng bộ dữ liệu ban đầu
  useEffect(() => {
    // Nhân bản sâu để tránh sửa đổi dữ liệu gốc ngoài mong muốn
    setTables(JSON.parse(JSON.stringify(initialTables)));
    setActiveTableIndex(0);
    setIsSaved(true);
  }, [initialTables]);

  const activeTable = tables[activeTableIndex];

  // Cập nhật giá trị ô khi người dùng nhập dữ liệu trực tiếp (Inline Editing)
  const handleCellChange = (rowIndex: number, colIndex: number, newValue: string) => {
    setTables(prev => prev.map((table, tIdx) => {
      if (tIdx === activeTableIndex) {
        const updatedRows = [...table.rows];
        updatedRows[rowIndex] = [...updatedRows[rowIndex]];
        updatedRows[rowIndex][colIndex] = newValue;
        return {
          ...table,
          rows: updatedRows
        };
      }
      return table;
    }));
    setIsSaved(false);
  };

  // Thay đổi tiêu đề cột
  const handleHeaderChange = (colIndex: number, newValue: string) => {
    setTables(prev => prev.map((table, tIdx) => {
      if (tIdx === activeTableIndex) {
        const updatedHeaders = [...table.headers];
        updatedHeaders[colIndex] = newValue;
        return {
          ...table,
          headers: updatedHeaders
        };
      }
      return table;
    }));
    setIsSaved(false);
  };

  // Sửa tên bảng biểu
  const handleTableNameChange = (newValue: string) => {
    setTables(prev => prev.map((table, tIdx) => {
      if (tIdx === activeTableIndex) {
        return {
          ...table,
          tableName: newValue
        };
      }
      return table;
    }));
    setIsSaved(false);
  };

  // Thêm một dòng mới vào bảng đang hoạt động
  const addRow = () => {
    if (!activeTable) return;
    setTables(prev => prev.map((table, tIdx) => {
      if (tIdx === activeTableIndex) {
        const newRow = new Array(table.headers.length).fill('');
        return {
          ...table,
          rows: [...table.rows, newRow]
        };
      }
      return table;
    }));
    setIsSaved(false);
  };

  // Xóa dòng được chọn
  const deleteRow = (rowIndex: number) => {
    if (!activeTable) return;
    setTables(prev => prev.map((table, tIdx) => {
      if (tIdx === activeTableIndex) {
        const updatedRows = table.rows.filter((_, idx) => idx !== rowIndex);
        return {
          ...table,
          rows: updatedRows
        };
      }
      return table;
    }));
    setIsSaved(false);
  };

  // Thêm một cột mới vào bảng đang hoạt động
  const addColumn = () => {
    if (!activeTable) return;
    setTables(prev => prev.map((table, tIdx) => {
      if (tIdx === activeTableIndex) {
        const updatedHeaders = [...table.headers, `Cột mới ${table.headers.length + 1}`];
        const updatedRows = table.rows.map(row => [...row, '']);
        return {
          ...table,
          headers: updatedHeaders,
          rows: updatedRows
        };
      }
      return table;
    }));
    setIsSaved(false);
  };

  // Xóa cột được chọn
  const deleteColumn = (colIndex: number) => {
    if (!activeTable || activeTable.headers.length <= 1) return;
    setTables(prev => prev.map((table, tIdx) => {
      if (tIdx === activeTableIndex) {
        const updatedHeaders = table.headers.filter((_, idx) => idx !== colIndex);
        const updatedRows = table.rows.map(row => row.filter((_, idx) => idx !== colIndex));
        return {
          ...table,
          headers: updatedHeaders,
          rows: updatedRows
        };
      }
      return table;
    }));
    setIsSaved(false);
  };

  // Khôi phục về dữ liệu OCR ban đầu của bảng
  const resetToOriginal = () => {
    if (window.confirm("Bạn có chắc chắn muốn hủy bỏ mọi chỉnh sửa và khôi phục dữ liệu gốc từ AI OCR?")) {
      setTables(JSON.parse(JSON.stringify(initialTables)));
      setIsSaved(true);
    }
  };

  // Lọc dòng dựa trên từ khóa tìm kiếm
  const getFilteredRows = () => {
    if (!activeTable) return [];
    if (!searchQuery.trim()) return activeTable.rows;

    const q = searchQuery.toLowerCase().trim();
    return activeTable.rows.filter(row => 
      row.some(cell => String(cell).toLowerCase().includes(q))
    );
  };

  const filteredRows = getFilteredRows();

  // Kích hoạt xuất Excel cho file đang sửa đổi
  const handleExport = () => {
    exportTablesToExcel(tables, fileName);
    setIsSaved(true);
  };

  if (tables.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-md animate-fade-in">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Không tìm thấy dữ liệu bảng biểu</h3>
        <p className="text-sm text-slate-500 mt-1">AI không phát hiện bảng nào trong tài liệu này hoặc quá trình xử lý đang chạy.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer">
          Quay lại hàng đợi
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.25 }}
      id="table-preview-modal" 
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[750px]"
    >
      {/* Modal Header */}
      <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">Trình xem & hiệu đính dữ liệu OCR</h2>
              {!isSaved && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 rounded-md uppercase animate-pulse">
                  Chưa lưu
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate max-w-md mt-0.5" title={fileName}>
              Tài liệu: {fileName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
            title="Hướng dẫn chỉnh sửa"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" /> <span className="hidden sm:inline">Hỗ trợ</span>
          </button>
          
          <button
            onClick={resetToOriginal}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Hủy bỏ mọi thay đổi hiện tại"
          >
            <Undo className="w-4 h-4" /> <span className="hidden sm:inline">Đặt lại gốc</span>
          </button>

          <button
            onClick={handleExport}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/15 cursor-pointer"
            title="Lưu lại và xuất file Excel hoàn tất"
          >
            <Download className="w-4 h-4" /> Xuất Excel (.xlsx)
          </button>

          <button
            onClick={onClose}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors text-xs font-bold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Help Banner */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-emerald-950/20 border-b border-emerald-500/10 p-4 text-xs text-emerald-300 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-1 text-emerald-200">Mẹo chỉnh sửa bảng Excel chuyên nghiệp:</span>
              <ul className="list-disc pl-4 space-y-1">
                <li>Bấm đúp trực tiếp vào bất cứ ô nào (kể cả ô tiêu đề cột) để sửa đổi văn bản trực tiếp.</li>
                <li>Sử dụng cột điều khiển ở bên phải dòng để xóa dòng không mong muốn.</li>
                <li>Thêm cột mới hoặc dòng mới bằng cách bấm các nút chức năng <span className="font-semibold text-white">"Thêm dòng mới"</span> và <span className="font-semibold text-white">"Thêm cột mới"</span>.</li>
                <li>Sau khi chỉnh sửa xong, bấm nút <span className="font-semibold text-emerald-400">"Xuất Excel (.xlsx)"</span> ở góc trên để tải ngay tệp bảng tính Excel chuẩn định dạng về máy của bạn!</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-header navigation: Tabs for selecting tables */}
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
          {tables.map((table, idx) => (
            <button
              key={table.id}
              onClick={() => {
                setActiveTableIndex(idx);
                setSearchQuery('');
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-2 cursor-pointer border ${
                activeTableIndex === idx
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/10'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="max-w-[120px] truncate">{table.tableName || `Bảng ${idx + 1}`}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTableIndex === idx ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
              }`}>
                Trang {table.pageNumber}
              </span>
            </button>
          ))}
        </div>

        {/* Live Search inside Table */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm dữ liệu trong bảng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Editor Main Section */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {activeTable ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950/10 border border-slate-200 dark:border-slate-800 rounded-xl">
            {/* Table Name and Page Location Edit Input */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
              <div className="flex-1 w-full">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Tên bảng biểu hiện tại</span>
                <input
                  type="text"
                  value={activeTable.tableName}
                  onChange={(e) => handleTableNameChange(e.target.value)}
                  className="w-full max-w-xl text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 focus:border-emerald-500 focus:outline-none py-0.5"
                  placeholder="Đặt tên cho bảng này..."
                />
              </div>

              {/* Editing Helper Buttons */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
                <button
                  onClick={addRow}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm dòng
                </button>
                <button
                  onClick={addColumn}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm cột
                </button>
              </div>
            </div>

            {/* Grid Container */}
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse border-spacing-0 text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800/90 font-semibold text-slate-800 dark:text-slate-200 z-10 shadow-sm">
                  <tr>
                    <th className="border-b border-r border-slate-200 dark:border-slate-700 p-2.5 w-12 text-center bg-slate-200/80 dark:bg-slate-800">
                      STT
                    </th>
                    {activeTable.headers.map((header, hIdx) => (
                      <th 
                        key={`h-${hIdx}`} 
                        className="border-b border-r border-slate-200 dark:border-slate-700 p-2.5 min-w-[120px] relative hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={header}
                            onChange={(e) => handleHeaderChange(hIdx, e.target.value)}
                            className="w-full bg-transparent font-bold text-slate-800 dark:text-slate-100 border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5"
                          />
                          {activeTable.headers.length > 1 && (
                            <button
                              onClick={() => deleteColumn(hIdx)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors cursor-pointer"
                              title="Xóa cột này"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="border-b border-slate-200 dark:border-slate-700 p-2.5 w-14 text-center bg-slate-200/50 dark:bg-slate-800">
                      Tác vụ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={activeTable.headers.length + 2} className="p-8 text-center text-slate-400 font-medium">
                        Không tìm thấy dòng nào khớp với từ khóa tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, rIdx) => (
                      <tr 
                        key={`r-${rIdx}`} 
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Number indicator */}
                        <td className="border-r border-slate-200 dark:border-slate-800 p-2 text-center font-semibold text-slate-400 bg-slate-50/50 dark:bg-slate-950/20">
                          {rIdx + 1}
                        </td>
                        
                        {/* Core editable cells */}
                        {row.map((cell, cIdx) => (
                          <td 
                            key={`c-${rIdx}-${cIdx}`} 
                            className="border-r border-slate-200 dark:border-slate-800 p-1.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-inset"
                          >
                            <input
                              type="text"
                              value={cell || ''}
                              onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                              className="w-full bg-transparent border-none text-slate-800 dark:text-slate-200 focus:outline-none px-1 py-0.5"
                            />
                          </td>
                        ))}

                        {/* Action column to delete row */}
                        <td className="p-1 text-center align-middle">
                          <button
                            onClick={() => deleteRow(rIdx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-lg transition-colors cursor-pointer"
                            title="Xóa dòng này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Grid footer metrics */}
            <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400 font-bold shrink-0">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                Tổng cộng: {activeTable.rows.length} dòng × {activeTable.headers.length} cột
              </span>
              <span>Trang gốc số: {activeTable.pageNumber}</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <span className="text-slate-400 text-sm mt-3 font-semibold">Đang tải bảng biểu...</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

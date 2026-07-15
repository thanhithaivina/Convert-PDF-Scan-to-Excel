import * as XLSX from 'xlsx';
import { TableData } from '../types';

/**
 * Trích xuất danh sách bảng biểu và xuất ra tệp Excel (.xlsx) chuẩn hóa,
 * có tự động giãn dòng, giãn cột, tạo trang tổng hợp và trang riêng biệt.
 */
export function exportTablesToExcel(tables: TableData[], baseFileName: string) {
  // Tạo workbook mới
  const wb = XLSX.utils.book_new();

  if (tables.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([["Không tìm thấy bảng biểu nào được trích xuất từ tài liệu này."]]);
    XLSX.utils.book_append_sheet(wb, ws, "Thông báo");
  } else {
    // 1. Tạo sheet "Tổng hợp" hiển thị tất cả các bảng nối tiếp nhau, phân tách bằng khoảng trống
    const masterRows: any[][] = [];
    
    tables.forEach((table, index) => {
      // Tiêu đề bảng lớn
      masterRows.push([table.tableName ? `★ ${table.tableName.toUpperCase()}` : `★ BẢNG SỐ ${index + 1} (Trang ${table.pageNumber})`]);
      masterRows.push([`Nguồn gốc: Trang số ${table.pageNumber} của file gốc`]);
      // Dòng tiêu đề cột (Headers)
      masterRows.push(table.headers);
      // Các dòng dữ liệu (Rows)
      table.rows.forEach(row => {
        masterRows.push(row);
      });
      // 2 Dòng trống ngăn cách giữa các bảng
      masterRows.push([]);
      masterRows.push([]);
    });

    const masterWs = XLSX.utils.aoa_to_sheet(masterRows);
    masterWs['!cols'] = autofitColumns(masterRows);
    XLSX.utils.book_append_sheet(wb, masterWs, "Tổng hợp toàn bộ");

    // 2. Tạo từng sheet riêng biệt cho từng bảng để người dùng tiện quản lý chi tiết
    tables.forEach((table, index) => {
      const sheetRows: any[][] = [];
      sheetRows.push([table.tableName ? `BẢNG: ${table.tableName}` : `BẢNG SỐ ${index + 1}`]);
      sheetRows.push([`Vị trí trong tài liệu: Trang số ${table.pageNumber}`]);
      sheetRows.push([]); // dòng trống
      sheetRows.push(table.headers);
      table.rows.forEach(row => {
        sheetRows.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetRows);
      ws['!cols'] = autofitColumns(sheetRows);

      // Giới hạn độ dài tên sheet tối đa 31 ký tự theo chuẩn Microsoft Excel
      let sheetName = table.tableName || `Bảng ${index + 1} (T${table.pageNumber})`;
      sheetName = sheetName.replace(/[\\\/\?\*\[\]]/g, ''); // loại bỏ ký tự đặc biệt không hợp lệ
      if (sheetName.length > 28) {
        sheetName = sheetName.substring(0, 25) + '...';
      }
      
      // Đảm bảo tên sheet không bị trùng lặp
      let uniqueName = sheetName;
      let counter = 1;
      while (wb.SheetNames.includes(uniqueName)) {
        uniqueName = `${sheetName.substring(0, 20)}_${counter++}`;
      }

      XLSX.utils.book_append_sheet(wb, ws, uniqueName);
    });
  }

  // Loại bỏ đuôi file cũ và thêm hậu tố ngày tháng xử lý để đặt tên file tải về
  const cleanName = baseFileName.replace(/\.[^/.]+$/, "");
  const timeSuffix = new Date().toLocaleTimeString('vi-VN', { hour12: false }).replace(/:/g, '-');
  const dateStr = new Date().toISOString().split('T')[0];
  
  XLSX.writeFile(wb, `${cleanName}_Excel_OCR_${dateStr}_${timeSuffix}.xlsx`);
}

/**
 * Tự động tính toán độ rộng tối ưu cho các cột dựa trên độ dài của nội dung dữ liệu
 */
function autofitColumns(rows: any[][]): XLSX.ColInfo[] {
  if (rows.length === 0) return [];
  
  const maxLen: number[] = [];
  
  rows.forEach(row => {
    if (!row) return;
    row.forEach((cell, colIndex) => {
      const val = cell !== undefined && cell !== null ? String(cell) : '';
      // Đo độ dài chuỗi (hỗ trợ tiếng Việt Unicode)
      const len = val.length;
      if (!maxLen[colIndex] || len > maxLen[colIndex]) {
        maxLen[colIndex] = len;
      }
    });
  });
  
  return maxLen.map(len => {
    // Chiều rộng tối thiểu là 12, tối đa là 60 để giữ form cân đối
    const wch = Math.min(Math.max(len + 4, 12), 60);
    return { wch };
  });
}

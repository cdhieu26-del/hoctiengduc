function doGet(e) {
  let sheetName = (e && e.parameter && e.parameter.sheet) ? e.parameter.sheet : 'tiengDucA1';
  
  // Gọi hàm getData đã có sẵn của bạn để lấy mảng dữ liệu
  let data = getData(sheetName);
  
  // Trả về dữ liệu dạng JSON để GitHub fetch() đọc được
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Lấy dữ liệu từ Sheet
function getData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getDisplayValues();
  if (data.length <= 1) return [];
  
  let result = [];
  for (let i = 1; i < data.length; i++) {
    result.push({
      rowIndex: i + 1,
      stt: data[i][0],
      chuDe: data[i][1],
      tiengDuc: data[i][2],
      ipa: data[i][3],
      tuLoai: data[i][4],
      maoTu: data[i][5],
      soNhieu: data[i][6],
      nghiaTV: data[i][7],
      viDu: data[i][8],
      dichViDu: data[i][9]
    });
  }
  return result;
}

// Thêm mới
function addData(sheetName, obj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  // Tính STT tự động
  const data = sheet.getDataRange().getValues();
  let maxSTT = 0;
  for (let i = 1; i < data.length; i++) {
    let currentSTT = parseInt(data[i][0]);
    if (!isNaN(currentSTT) && currentSTT > maxSTT) {
      maxSTT = currentSTT;
    }
  }
  let newSTT = maxSTT + 1;
  
  sheet.appendRow([
    newSTT, obj.chuDe, obj.tiengDuc, obj.ipa, obj.tuLoai, 
    obj.maoTu, obj.soNhieu, obj.nghiaTV, obj.viDu, obj.dichViDu
  ]);
  return "Thêm mới thành công!";
}

// Sửa dữ liệu
function updateData(sheetName, rowIndex, obj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const range = sheet.getRange(rowIndex, 2, 1, 9); // Cập nhật từ cột B (Chủ đề) đến J
  range.setValues([[
    obj.chuDe, obj.tiengDuc, obj.ipa, obj.tuLoai, 
    obj.maoTu, obj.soNhieu, obj.nghiaTV, obj.viDu, obj.dichViDu
  ]]);
  return "Cập nhật thành công!";
}

// Xóa dữ liệu
function deleteData(sheetName, rowIndex) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  sheet.deleteRow(rowIndex);
  return "Xóa thành công!";
}

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { Order, OrderItem } from '../types';

export const exportToCSV = <T extends Record<string, unknown>>(data: T[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = <T extends Record<string, unknown>>(data: T[], filename: string, title: string) => {
  if (data.length === 0) return;

  const doc = new jsPDF();
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    })
  );

  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Erstellt am: ${new Date().toLocaleString('de-DE')}`, 14, 22);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [24, 119, 242] },
  });

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToExcel = async <T extends Record<string, unknown>>(data: T[], filename: string) => {
  if (data.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Daten');

  // Add headers
  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);
    
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1877F2' },
    };
    headerRow.font = { ...headerRow.font, color: { argb: 'FFFFFFFF' } };
  }

  // Add data rows
  data.forEach(row => {
    const values = Object.values(row);
    worksheet.addRow(values);
  });

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, cell => {
      const cellValue = cell.value?.toString() || '';
      if (cellValue.length > maxLength) {
        maxLength = cellValue.length;
      }
    });
    column.width = Math.min(maxLength + 2, 50);
  });

  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Customer-specific Export Functions
export const exportOrderHistoryToCSV = (orders: (Order & { restaurant?: { name?: string }; items?: OrderItem[] })[]) => {
  const csvData = orders.map(order => ({
    'Bestellnummer': order.id,
    'Datum': new Date(order.createdAt).toLocaleString('de-DE'),
    'Status': order.status,
    'Restaurant': order.restaurant?.name || 'Unbekannt',
    'Adresse': order.address || '',
    'Telefon': order.phone || '',
    'Gesamtbetrag': `€${order.totalAmount?.toFixed(2) || '0.00'}`,
    'Anzahl Gerichte': order.items?.reduce((sum: number, item: OrderItem) => sum + (item.quantity || 0), 0) || 0,
  }));

  exportToCSV(csvData, 'bestellhistorie');
};

export const exportOrderHistoryToPDF = (orders: (Order & { restaurant?: { name?: string } })[]) => {
  const pdfData = orders.map(order => ({
    'Bestellnummer': order.id,
    'Datum': new Date(order.createdAt).toLocaleString('de-DE'),
    'Status': order.status,
    'Restaurant': order.restaurant?.name || 'Unbekannt',
    'Gesamtbetrag': `€${order.totalAmount?.toFixed(2) || '0.00'}`,
  }));

  exportToPDF(pdfData, 'bestellhistorie', 'Bestellhistorie');
};

export const exportOrderHistoryToExcel = async (orders: (Order & { restaurant?: { name?: string }; items?: OrderItem[] })[]) => {
  const excelData = orders.map(order => ({
    'Bestellnummer': order.id,
    'Datum': new Date(order.createdAt).toLocaleString('de-DE'),
    'Status': order.status,
    'Restaurant': order.restaurant?.name || 'Unbekannt',
    'Adresse': order.address || '',
    'Telefon': order.phone || '',
    'Gesamtbetrag': order.totalAmount?.toFixed(2) || '0.00',
    'Anzahl Gerichte': order.items?.reduce((sum: number, item: OrderItem) => sum + (item.quantity || 0), 0) || 0,
  }));

  await exportToExcel(excelData, 'bestellhistorie');
};

export const exportFavoritesToCSV = (favorites: Array<{ restaurant?: { name?: string; description?: string; address?: string; phone?: string; email?: string }; createdAt?: string | number }>) => {
  const csvData = favorites.map(favorite => ({
    'Restaurant': favorite.restaurant?.name || 'Unbekannt',
    'Beschreibung': favorite.restaurant?.description || '',
    'Adresse': favorite.restaurant?.address || '',
    'Telefon': favorite.restaurant?.phone || '',
    'E-Mail': favorite.restaurant?.email || '',
    'Hinzugefügt am': new Date(favorite.createdAt || Date.now()).toLocaleString('de-DE'),
  }));

  exportToCSV(csvData, 'favoriten');
};

export const exportFavoritesToPDF = (favorites: Array<{ restaurant?: { name?: string; address?: string; phone?: string }; createdAt?: string | number }>) => {
  const pdfData = favorites.map(favorite => ({
    'Restaurant': favorite.restaurant?.name || 'Unbekannt',
    'Adresse': favorite.restaurant?.address || '',
    'Telefon': favorite.restaurant?.phone || '',
    'Hinzugefügt am': new Date(favorite.createdAt || Date.now()).toLocaleString('de-DE'),
  }));

  exportToPDF(pdfData, 'favoriten', 'Favoriten');
};

export const exportFavoritesToExcel = async (favorites: Array<{ restaurant?: { name?: string; description?: string; address?: string; phone?: string; email?: string }; createdAt?: string | number }>) => {
  const excelData = favorites.map(favorite => ({
    'Restaurant': favorite.restaurant?.name || 'Unbekannt',
    'Beschreibung': favorite.restaurant?.description || '',
    'Adresse': favorite.restaurant?.address || '',
    'Telefon': favorite.restaurant?.phone || '',
    'E-Mail': favorite.restaurant?.email || '',
    'Hinzugefügt am': new Date(favorite.createdAt || Date.now()).toLocaleString('de-DE'),
  }));

  await exportToExcel(excelData, 'favoriten');
};


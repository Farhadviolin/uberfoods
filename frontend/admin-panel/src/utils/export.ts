import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { logger } from './logger';

export const exportToCSV = (data: any[], filename: string) => {
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

export const exportToPDF = (data: any[], filename: string, title: string) => {
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

export const exportToExcel = async (data: any[], filename: string) => {
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
    if (column && typeof column.eachCell === 'function') {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const cellValue = cell.value?.toString() || '';
        if (cellValue.length > maxLength) {
          maxLength = cellValue.length;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    }
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

export const exportOrdersToCSV = (orders: any[]) => {
  const csvData = orders.map(order => ({
    'Kunde': order.customer?.name || order.customer?.email || 'Unknown customer',
    'E-Mail': order.customer?.email || 'Unknown customer',
    'Restaurant': order.restaurant?.name || 'Unknown restaurant',
    'Fahrer': order.driver?.name || 'Nicht zugewiesen',
    'Bestellnummer': order.id,
    'Datum': new Date(order.createdAt).toLocaleString('de-DE'),
    'Status': order.status,
    'Adresse': order.address,
    'Telefon': order.phone,
    'Gesamtbetrag': order.totalAmount.toFixed(2),
    'Anzahl Gerichte': order.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
  }));

  exportToCSV(csvData, 'bestellungen');
};

export const exportRestaurantsToCSV = (restaurants: any[]) => {
  const csvData = restaurants.map(restaurant => ({
    'Name': restaurant.name,
    'Beschreibung': restaurant.description || '',
    'Adresse': restaurant.address,
    'Telefon': restaurant.phone,
    'E-Mail': restaurant.email,
    'Aktiv': restaurant.isActive ? 'Ja' : 'Nein',
    'Anzahl Gerichte': restaurant.dishes?.length || 0,
  }));

  exportToCSV(csvData, 'restaurants');
};

export const exportCustomersToCSV = (customers: any[]) => {
  const csvData = customers.map(customer => ({
    'Name': customer.name,
    'E-Mail': customer.email,
    'Telefon': customer.phone,
    'Adresse': customer.address || '',
    'Anzahl Bestellungen': customer.orders?.length || 0,
  }));

  exportToCSV(csvData, 'kunden');
};

// PDF Export Funktionen
export const exportOrdersToPDF = (orders: any[]) => {
  const pdfData = orders.map(order => ({
    'Kunde': order.customer?.name || order.customer?.email || 'Unknown customer',
    'Restaurant': order.restaurant?.name || 'Unknown restaurant',
    'Fahrer': order.driver?.name || 'Nicht zugewiesen',
    'Bestellnummer': order.id,
    'Datum': new Date(order.createdAt).toLocaleString('de-DE'),
    'Status': order.status,
    'Gesamtbetrag': `${order.totalAmount.toFixed(2)} €`,
  }));

  exportToPDF(pdfData, 'bestellungen', 'Bestellungen Übersicht');
};

export const exportRestaurantsToPDF = (restaurants: any[]) => {
  const pdfData = restaurants.map(restaurant => ({
    'Name': restaurant.name,
    'Adresse': restaurant.address,
    'Telefon': restaurant.phone,
    'E-Mail': restaurant.email,
    'Aktiv': restaurant.isActive ? 'Ja' : 'Nein',
    'Anzahl Gerichte': restaurant.dishes?.length || 0,
  }));

  exportToPDF(pdfData, 'restaurants', 'Restaurants Übersicht');
};

export const exportCustomersToPDF = (customers: any[]) => {
  const pdfData = customers.map(customer => ({
    'Name': customer.name,
    'E-Mail': customer.email,
    'Telefon': customer.phone,
    'Adresse': customer.address || '',
    'Anzahl Bestellungen': customer.orders?.length || 0,
  }));

  exportToPDF(pdfData, 'kunden', 'Kunden Übersicht');
};

// Excel Export Funktionen
export const exportOrdersToExcel = async (orders: any[]) => {
  const excelData = orders.map(order => ({
    'Kunde': order.customer?.name || order.customer?.email || 'Unknown customer',
    'E-Mail': order.customer?.email || 'Unknown customer',
    'Restaurant': order.restaurant?.name || 'Unknown restaurant',
    'Fahrer': order.driver?.name || 'Nicht zugewiesen',
    'Bestellnummer': order.id,
    'Datum': new Date(order.createdAt).toLocaleString('de-DE'),
    'Status': order.status,
    'Adresse': order.address,
    'Telefon': order.phone,
    'Gesamtbetrag': order.totalAmount.toFixed(2),
    'Anzahl Gerichte': order.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
  }));

  await exportToExcel(excelData, 'bestellungen');
};

export const exportRestaurantsToExcel = async (restaurants: any[]) => {
  const excelData = restaurants.map(restaurant => ({
    'Name': restaurant.name,
    'Beschreibung': restaurant.description || '',
    'Adresse': restaurant.address,
    'Telefon': restaurant.phone,
    'E-Mail': restaurant.email,
    'Aktiv': restaurant.isActive ? 'Ja' : 'Nein',
    'Anzahl Gerichte': restaurant.dishes?.length || 0,
  }));

  await exportToExcel(excelData, 'restaurants');
};

export const exportCustomersToExcel = async (customers: any[]) => {
  const excelData = customers.map(customer => ({
    'Name': customer.name,
    'E-Mail': customer.email,
    'Telefon': customer.phone,
    'Adresse': customer.address || '',
    'Anzahl Bestellungen': customer.orders?.length || 0,
  }));

  await exportToExcel(excelData, 'kunden');
};

// Promotion Export Funktionen
export const exportPromotionsToCSV = (promotions: any[]) => {
  const csvData = promotions.map(promotion => ({
    'Name': promotion.name,
    'Code': promotion.code || 'N/A',
    'Rabatt': promotion.discountType === 'PERCENTAGE' 
      ? `${promotion.discount}%` 
      : `${promotion.discount.toFixed(2)} €`,
    'Rabatt-Typ': promotion.discountType === 'PERCENTAGE' ? 'Prozent' : 'Fester Betrag',
    'Restaurant': promotion.restaurant?.name || 'Global',
    'Startdatum': new Date(promotion.startDate).toLocaleDateString('de-DE'),
    'Enddatum': new Date(promotion.endDate).toLocaleDateString('de-DE'),
    'Mindestbestellwert': promotion.minOrderAmount ? `${promotion.minOrderAmount.toFixed(2)} €` : 'Keine',
    'Max. Verwendungen': promotion.maxUses || 'Unbegrenzt',
    'Aktuelle Verwendungen': promotion.currentUses,
    'Status': promotion.isActive ? 'Aktiv' : 'Inaktiv',
  }));

  exportToCSV(csvData, 'promotionen');
};

export const exportPromotionsToPDF = (promotions: any[]) => {
  const pdfData = promotions.map(promotion => ({
    'Name': promotion.name,
    'Code': promotion.code || 'N/A',
    'Rabatt': promotion.discountType === 'PERCENTAGE' 
      ? `${promotion.discount}%` 
      : `${promotion.discount.toFixed(2)} €`,
    'Restaurant': promotion.restaurant?.name || 'Global',
    'Zeitraum': `${new Date(promotion.startDate).toLocaleDateString('de-DE')} - ${new Date(promotion.endDate).toLocaleDateString('de-DE')}`,
    'Verwendungen': promotion.maxUses 
      ? `${promotion.currentUses} / ${promotion.maxUses}`
      : promotion.currentUses.toString(),
    'Status': promotion.isActive ? 'Aktiv' : 'Inaktiv',
  }));

  exportToPDF(pdfData, 'promotionen', 'Promotionen Übersicht');
};

export const exportPromotionsToExcel = async (promotions: any[]) => {
  const excelData = promotions.map(promotion => ({
    'Name': promotion.name,
    'Code': promotion.code || 'N/A',
    'Rabatt': promotion.discountType === 'PERCENTAGE' 
      ? `${promotion.discount}%` 
      : `${promotion.discount.toFixed(2)} €`,
    'Rabatt-Typ': promotion.discountType === 'PERCENTAGE' ? 'Prozent' : 'Fester Betrag',
    'Restaurant': promotion.restaurant?.name || 'Global',
    'Startdatum': new Date(promotion.startDate).toLocaleDateString('de-DE'),
    'Enddatum': new Date(promotion.endDate).toLocaleDateString('de-DE'),
    'Mindestbestellwert': promotion.minOrderAmount ? `${promotion.minOrderAmount.toFixed(2)} €` : 'Keine',
    'Max. Verwendungen': promotion.maxUses || 'Unbegrenzt',
    'Aktuelle Verwendungen': promotion.currentUses,
    'Status': promotion.isActive ? 'Aktiv' : 'Inaktiv',
  }));

  await exportToExcel(excelData, 'promotionen');
};

// Driver Export Funktionen
export const exportDriversToCSV = (drivers: any[]) => {
  const csvData = drivers.map(driver => ({
    'Name': driver.name,
    'E-Mail': driver.email,
    'Telefon': driver.phone || '',
    'Status': driver.currentStatus || 'OFFLINE',
    'Aktiv': driver.isActive ? 'Ja' : 'Nein',
    'Bewertung': driver.rating?.toFixed(2) || '0.00',
    'Anzahl Lieferungen': driver.totalDeliveries || 0,
    'Fahrzeug': driver.vehicleInfo ? JSON.stringify(driver.vehicleInfo) : '',
  }));

  exportToCSV(csvData, 'fahrer');
};

export const exportDriversToPDF = (drivers: any[]) => {
  const pdfData = drivers.map(driver => ({
    'Name': driver.name,
    'E-Mail': driver.email,
    'Telefon': driver.phone || '',
    'Status': driver.currentStatus || 'OFFLINE',
    'Aktiv': driver.isActive ? 'Ja' : 'Nein',
    'Bewertung': driver.rating?.toFixed(2) || '0.00',
    'Anzahl Lieferungen': driver.totalDeliveries || 0,
  }));

  exportToPDF(pdfData, 'fahrer', 'Fahrer Übersicht');
};

export const exportDriversToExcel = async (drivers: any[]) => {
  const excelData = drivers.map(driver => ({
    'Name': driver.name,
    'E-Mail': driver.email,
    'Telefon': driver.phone || '',
    'Status': driver.currentStatus || 'OFFLINE',
    'Aktiv': driver.isActive ? 'Ja' : 'Nein',
    'Bewertung': driver.rating?.toFixed(2) || '0.00',
    'Anzahl Lieferungen': driver.totalDeliveries || 0,
    'Fahrzeug': driver.vehicleInfo ? JSON.stringify(driver.vehicleInfo) : '',
  }));

  await exportToExcel(excelData, 'fahrer');
};

// Inventory Export Funktionen
export const exportInventoryToCSV = (inventory: any[]) => {
  const csvData = inventory.map(item => ({
    'Artikel': item.name,
    'Kategorie': item.category || '',
    'Lagerbestand': item.stock || 0,
    'Mindestbestand': item.minStock || 0,
    'Einheit': item.unit || '',
    'Preis': item.price ? `${item.price.toFixed(2)} €` : '',
    'Lieferant': item.supplier?.name || '',
    'Status': item.isActive ? 'Aktiv' : 'Inaktiv',
  }));

  exportToCSV(csvData, 'inventar');
};

export const exportInventoryToPDF = (inventory: any[]) => {
  const pdfData = inventory.map(item => ({
    'Artikel': item.name,
    'Kategorie': item.category || '',
    'Lagerbestand': item.stock || 0,
    'Mindestbestand': item.minStock || 0,
    'Einheit': item.unit || '',
    'Preis': item.price ? `${item.price.toFixed(2)} €` : '',
    'Status': item.isActive ? 'Aktiv' : 'Inaktiv',
  }));

  exportToPDF(pdfData, 'inventar', 'Inventar Übersicht');
};

export const exportInventoryToExcel = async (inventory: any[]) => {
  const excelData = inventory.map(item => ({
    'Artikel': item.name,
    'Kategorie': item.category || '',
    'Lagerbestand': item.stock || 0,
    'Mindestbestand': item.minStock || 0,
    'Einheit': item.unit || '',
    'Preis': item.price || 0,
    'Lieferant': item.supplier?.name || '',
    'Status': item.isActive ? 'Aktiv' : 'Inaktiv',
  }));

  await exportToExcel(excelData, 'inventar');
};

// Financial/Accounting Export Funktionen
export const exportFinancialToCSV = (transactions: any[]) => {
  const csvData = transactions.map(transaction => ({
    'Datum': new Date(transaction.date || transaction.createdAt).toLocaleDateString('de-DE'),
    'Typ': transaction.type || '',
    'Beschreibung': transaction.description || '',
    'Betrag': transaction.amount ? `${transaction.amount.toFixed(2)} €` : '0.00 €',
    'Status': transaction.status || '',
    'Referenz': transaction.referenceId || '',
  }));

  exportToCSV(csvData, 'finanzen');
};

export const exportFinancialToPDF = (transactions: any[]) => {
  const pdfData = transactions.map(transaction => ({
    'Datum': new Date(transaction.date || transaction.createdAt).toLocaleDateString('de-DE'),
    'Typ': transaction.type || '',
    'Beschreibung': transaction.description || '',
    'Betrag': transaction.amount ? `${transaction.amount.toFixed(2)} €` : '0.00 €',
    'Status': transaction.status || '',
  }));

  exportToPDF(pdfData, 'finanzen', 'Finanzübersicht');
};

export const exportFinancialToExcel = async (transactions: any[]) => {
  const excelData = transactions.map(transaction => ({
    'Datum': new Date(transaction.date || transaction.createdAt).toLocaleDateString('de-DE'),
    'Typ': transaction.type || '',
    'Beschreibung': transaction.description || '',
    'Betrag': transaction.amount || 0,
    'Status': transaction.status || '',
    'Referenz': transaction.referenceId || '',
  }));

  await exportToExcel(excelData, 'finanzen');
};

// Analytics/Reports Export Funktionen
export const exportAnalyticsToCSV = (analytics: any[], reportName: string = 'analytics') => {
  if (!analytics || analytics.length === 0) return;
  
  // Flatten nested objects for CSV
  const csvData = analytics.map(item => {
    const flattened: any = {};
    Object.keys(item).forEach(key => {
      const value = item[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.keys(value).forEach(subKey => {
          flattened[`${key}_${subKey}`] = value[subKey];
        });
      } else if (Array.isArray(value)) {
        flattened[key] = value.length;
      } else {
        flattened[key] = value;
      }
    });
    return flattened;
  });

  exportToCSV(csvData, reportName);
};

export const exportAnalyticsToPDF = (analytics: any[], reportName: string = 'analytics', title: string = 'Analytics Report') => {
  if (!analytics || analytics.length === 0) return;
  
  // Flatten nested objects for PDF
  const pdfData = analytics.map(item => {
    const flattened: any = {};
    Object.keys(item).forEach(key => {
      const value = item[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.keys(value).forEach(subKey => {
          flattened[`${key}_${subKey}`] = value[subKey];
        });
      } else if (Array.isArray(value)) {
        flattened[key] = value.length;
      } else {
        flattened[key] = value;
      }
    });
    return flattened;
  });

  exportToPDF(pdfData, reportName, title);
};

export const exportAnalyticsToExcel = async (analytics: any[], reportName: string = 'analytics') => {
  if (!analytics || analytics.length === 0) return;
  
  // Flatten nested objects for Excel
  const excelData = analytics.map(item => {
    const flattened: any = {};
    Object.keys(item).forEach(key => {
      const value = item[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.keys(value).forEach(subKey => {
          flattened[`${key}_${subKey}`] = value[subKey];
        });
      } else if (Array.isArray(value)) {
        flattened[key] = value.length;
      } else {
        flattened[key] = value;
      }
    });
    return flattened;
  });

  await exportToExcel(excelData, reportName);
};

// Universal Bulk Export Function
export interface BulkExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  data: any[];
  filename: string;
  title?: string;
  columns?: string[]; // Optional: specify which columns to export
  transform?: (item: any) => any; // Optional: custom transformation function
}

export const bulkExport = async (options: BulkExportOptions) => {
  const { format, data, filename, title, columns, transform } = options;
  
  if (!data || data.length === 0) {
    logger.warn('No data to export');
    return;
  }

  // Apply transformation if provided
  let processedData = transform ? data.map(transform) : data;

  // Filter columns if specified
  if (columns && columns.length > 0) {
    processedData = processedData.map(item => {
      const filtered: any = {};
      columns.forEach(col => {
        if (item[col] !== undefined) {
          filtered[col] = item[col];
        }
      });
      return filtered;
    });
  }

  // Export based on format
  switch (format) {
    case 'csv':
      exportToCSV(processedData, filename);
      break;
    case 'excel':
      await exportToExcel(processedData, filename);
      break;
    case 'pdf':
      exportToPDF(processedData, filename, title || filename);
      break;
    default:
      logger.error(`Unsupported export format: ${format}`);
  }
};


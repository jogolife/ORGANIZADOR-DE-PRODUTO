/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { ProductGroup, GroupFile } from './types.ts';

/**
 * Format file size into a human-readable string.
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats a single product group text section as a cohesive script/post template.
 */
export function compileGroupText(group: ProductGroup): string {
  let output = `📦 PRODUTO: ${group.id} - ${group.name}\n`;
  if (group.affiliateLink) {
    output += `🔗 LINK DE AFILIADO: ${group.affiliateLink}\n`;
  }
  output += `─────────────────────────────────────────\n`;
  
  if (group.texts.length === 0) {
    output += `(Nenhum texto copiado ainda)\n`;
  } else {
    group.texts.forEach((text, idx) => {
      output += `[Copiar ${idx + 1}]:\n${text}\n\n`;
    });
  }
  return output.trim();
}

/**
 * Copies a single string to the device's clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn('Failed to copy using navigator.clipboard', err);
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed'; // Avoid scrolling
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (fallbackErr) {
      console.error('Clipboard fallback also failed', fallbackErr);
      return false;
    }
  }
}

/**
 * Exports all product groups data into a single, clean CSV string.
 */
export function exportToCSV(groups: ProductGroup[]): string {
  const headers = ['ID', 'Nome', 'Link de Afiliado', 'Qtd Textos', 'Qtd Midias', 'isCompleted', 'Criação', 'Textos Capturados'];
  
  const rows = groups.map(g => {
    const escapedTexts = g.texts.map(t => t.replace(/"/g, '""')).join(' | ');
    return [
      g.id,
      g.name,
      g.affiliateLink || '',
      g.texts.length.toString(),
      g.files.length.toString(),
      g.isCompleted ? 'SIM' : 'NÃO',
      g.createdAt,
      `"${escapedTexts}"`
    ];
  });
  
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(val => {
      // Escape commas, quotes and newlines
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(','))
  ].join('\n');
  
  return csvContent;
}

/**
 * Dynamically downloads a text payload as a local file.
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Converts a DataURL (base64) string back to a Uint8Array or Blob for zipping.
 */
export function dataURLtoUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(';base64,');
  const base64 = parts[parts.length - 1];
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates and downloads a .ZIP folder matching the exact directory structure requested:
 * Productos/
 *   G1_Geladeira/
 *     textos.txt
 *     Geladeira_01.jpg
 *     Geladeira_01.mp4
 */
export async function downloadAllGroupsZip(groups: ProductGroup[]): Promise<boolean> {
  try {
    const zip = new JSZip();
    const rootFolder = zip.folder('Produtos');
    
    if (!rootFolder) return false;
    
    for (const group of groups) {
      const folderName = `${group.id}_${group.name.replace(/[\s\W]+/g, '_')}`;
      const groupFolder = rootFolder.folder(folderName);
      
      if (!groupFolder) continue;
      
      // 1. Create texts file
      let textsContent = `===== PRODUTO: ${group.id} - ${group.name} =====\n`;
      if (group.affiliateLink) {
        textsContent += `LINK DE AFILIADO: ${group.affiliateLink}\n`;
      }
      textsContent += `-----------------------------------------\n\n`;
      
      group.texts.forEach((txt, idx) => {
        textsContent += `[ITEM ${idx + 1}]\n${txt}\n\n`;
      });
      
      groupFolder.file('textos.db', textsContent);
      
      // 2. Add image and video files
      for (const file of group.files) {
        if (!file.dataUrl) continue;
        try {
          const rawData = dataURLtoUint8Array(file.dataUrl);
          groupFolder.file(file.name, rawData);
        } catch (fileErr) {
          console.error(`Falha ao decodificar arquivo ${file.name} para o ZIP:`, fileErr);
        }
      }
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Produtos_Redes_Sociais.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Erro ao gerar arquivo ZIP:', err);
    return false;
  }
}

/**
 * Generates and downloads a single group as a .ZIP folder.
 */
export async function downloadSingleGroupZip(group: ProductGroup): Promise<boolean> {
  try {
    const zip = new JSZip();
    const folderName = `${group.id}_${group.name.replace(/[\s\W]+/g, '_')}`;
    const groupFolder = zip.folder(folderName);
    
    if (!groupFolder) return false;
    
    // 1. Create texts file
    let textsContent = `===== PRODUTO: ${group.id} - ${group.name} =====\n`;
    if (group.affiliateLink) {
      textsContent += `LINK DE AFILIADO: ${group.affiliateLink}\n`;
    }
    textsContent += `-----------------------------------------\n\n`;
    
    group.texts.forEach((txt, idx) => {
      textsContent += `[ITEM ${idx + 1}]\n${txt}\n\n`;
    });
    
    groupFolder.file('textos.db', textsContent);
    
    // 2. Add files
    for (const file of group.files) {
      if (!file.dataUrl) continue;
      try {
        const rawData = dataURLtoUint8Array(file.dataUrl);
        groupFolder.file(file.name, rawData);
      } catch (fileErr) {
        console.error(`Falha ao decodificar arquivo ${file.name} para o ZIP:`, fileErr);
      }
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Erro ao gerar arquivo ZIP para grupo único:', err);
    return false;
  }
}

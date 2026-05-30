/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GroupFile {
  id: string;
  name: string;      // e.g., "Geladeira_01.jpg"
  originalName: string;
  type: 'image' | 'video';
  mimeType: string;
  size: number;
  dataUrl: string;   // base64 or object URL of the file
}

export interface ProductGroup {
  id: string;          // e.g., "G1"
  name: string;        // e.g., "Geladeira"
  affiliateLink: string;
  autoSaveLimit: number | null; // e.g., 5 texts, or null for manual "Finalizar"
  texts: string[];     // Collected strings
  files: GroupFile[];  // Connected image & video assets
  isCompleted: boolean;
  createdAt: string;
}

export interface GeneratedPost {
  platform: 'whatsapp' | 'instagram' | 'pinterest' | 'tiktok' | 'kwai' | 'facebook';
  content: string;
}

export interface AppHistory {
  groups: ProductGroup[];
}

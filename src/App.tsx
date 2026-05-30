/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Clipboard, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Trash2, 
  Download, 
  Plus, 
  Search, 
  Check, 
  Copy, 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  Sparkles, 
  MessageSquare, 
  Instagram, 
  Share2, 
  RefreshCw, 
  HelpCircle, 
  ArrowRight,
  PlusCircle,
  FileCode,
  FileVideo,
  FileImage,
  Upload,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductGroup, GroupFile } from './types.ts';
import { 
  formatSize, 
  copyToClipboard, 
  downloadFile, 
  downloadAllGroupsZip, 
  downloadSingleGroupZip 
} from './utils.ts';

// Placeholder mock assets for the G1 & FOGAO default examples
const DEFAULT_G1_IMAGE = "https://images.unsplash.com/photo-1571175432240-a3597c27091a?w=600&auto=format&fit=crop&q=80";
const DEFAULT_FOGAO_IMAGE = "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=600&auto=format&fit=crop&q=80";

export default function App() {
  // Database initialized with G1 and FOGAO as specified by user
  const [groups, setGroups] = useState<ProductGroup[]>(() => {
    const saved = localStorage.getItem('social_post_organizer_groups_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing groups', e);
      }
    }
    return [
      {
        id: 'G1',
        name: 'G1',
        affiliateLink: '',
        autoSaveLimit: null,
        texts: [
          'Geladeira Frost Free',
          'R$ 400'
        ],
        files: [
          {
            id: 'g1_img_1',
            name: 'G1_01.jpg',
            originalName: 'geladeira_frontal.jpg',
            type: 'image',
            mimeType: 'image/jpeg',
            size: 85200,
            dataUrl: DEFAULT_G1_IMAGE
          },
          {
            id: 'g1_vid_1',
            name: 'G1_01.mp4',
            originalName: 'regras_cozinha.mp4',
            type: 'video',
            mimeType: 'video/mp4',
            size: 450000,
            dataUrl: 'https://assets.mixkit.co/videos/preview/mixkit-kitchen-interior-with-a-refrigerator-and-microwave-43187-large.mp4'
          }
        ],
        isCompleted: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'FOGAO',
        name: 'FOGAO',
        affiliateLink: '',
        autoSaveLimit: null,
        texts: [
          'Fogão 4 bocas Consul',
          'R$ 290'
        ],
        files: [
          {
            id: 'fogao_img_1',
            name: 'FOGAO_01.jpg',
            originalName: 'fogao.jpeg',
            type: 'image',
            mimeType: 'image/jpeg',
            size: 92400,
            dataUrl: DEFAULT_FOGAO_IMAGE
          }
        ],
        isCompleted: false,
        createdAt: new Date().toISOString()
      }
    ];
  });

  // Track the ID of the current active project
  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
    const savedId = localStorage.getItem('social_post_organizer_active_id_v2');
    if (savedId) {
      return savedId;
    }
    return 'G1';
  });

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog state for "Novo Projeto"
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectIdInput, setNewProjectIdInput] = useState('');

  // Sandbox visual paste alert overlay
  const [pasteOverlayActive, setPasteOverlayActive] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Manual Text Box state for sandbox copy/pasting
  const [manualText, setManualText] = useState('');

  // Drag and drop helper states
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [activeSocialDropZone, setActiveSocialDropZone] = useState<string | null>(null);
  const [socialModalPreview, setSocialModalPreview] = useState<{
    open: boolean;
    platform: string;
    fileUrl?: string;
    fileName?: string;
    caption?: string;
  } | null>(null);

  // File Input References
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Auto-save changes to localStorage
  useEffect(() => {
    localStorage.setItem('social_post_organizer_groups_v2', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('social_post_organizer_active_id_v2', activeGroupId);
  }, [activeGroupId]);

  // Find active group data safe-getter
  const activeGroup = groups.find(g => g.id.toUpperCase() === activeGroupId.toUpperCase()) || groups[0];

  // Helper notice notification
  const showNotification = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  // Create a new project accepting only the ID (G1, GELADEIRA, F1, FOGAO etc)
  const handleCreateNewProject = (idStr: string) => {
    const idClean = idStr.trim().toUpperCase();
    if (!idClean) return;

    // Check if project already exists
    const existing = groups.find(g => g.id.toUpperCase() === idClean);
    if (existing) {
      // If it exists, simply make it active
      setActiveGroupId(existing.id);
      showNotification(`Projeto "${existing.id}" reativado! 📁`);
      setShowNewProjectModal(false);
      setNewProjectIdInput('');
      return;
    }

    // Creating new template product group
    const newProject: ProductGroup = {
      id: idClean,
      name: idClean, // Single ID identifier used for name and path
      affiliateLink: '',
      autoSaveLimit: null,
      texts: [],
      files: [],
      isCompleted: false,
      createdAt: new Date().toISOString()
    };

    setGroups(prev => [newProject, ...prev]);
    setActiveGroupId(idClean);
    showNotification(`Projeto "${idClean}" iniciado! 🚀`);
    setShowNewProjectModal(false);
    setNewProjectIdInput('');
  };

  // Listen globally to CTRL+C to automatically capture selected text to active product
  useEffect(() => {
    const handleGlobalCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      // Ignore if currently typing inside input components
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const selection = window.getSelection()?.toString();
      if (selection && selection.trim() !== '') {
        const text = selection.trim();
        addTextToActiveProject(text);
      }
    };

    window.addEventListener('copy', handleGlobalCopy);
    return () => window.removeEventListener('copy', handleGlobalCopy);
  }, [activeGroupId]);

  // Listen globally to CTRL+V to automatically capture text or paste images/files
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (!activeGroup) {
        showNotification("Crie ou ative um projeto antes!");
        return;
      }

      // 1. Text Paste
      const text = e.clipboardData?.getData('text');
      if (text && text.trim() !== '') {
        e.preventDefault();
        addTextToActiveProject(text);
      }

      // 2. File Paste (Images/Videos)
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              await handleFileSave(file);
            }
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [activeGroupId, activeGroup]);

  // Add text dynamically to current active project
  const addTextToActiveProject = (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    setGroups(prev => prev.map(g => {
      if (g.id.toUpperCase() === activeGroupId.toUpperCase()) {
        // Prevent exact duplicates in active group
        if (g.texts.includes(cleanText)) return g;
        return {
          ...g,
          texts: [...g.texts, cleanText]
        };
      }
      return g;
    }));

    setPasteOverlayActive(true);
    setTimeout(() => setPasteOverlayActive(false), 900);
    showNotification("✅ Texto salvo automaticamente no projeto ativo!");
  };

  // Convert files to base64 Data URLs and save auto-renaming them based on active project ID
  const handleFileSave = async (file: File) => {
    if (!activeGroup) {
      showNotification("Por favor, selecione um projeto ativo!");
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      showNotification("Envie apenas imagens ou vídeos!");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;

        // Auto-increment renaming logic based on how many files of this type already exist
        // Scheme: ${PROJECT-ID}_${INDEX}.${EXTENSION}
        const currentFilesOfType = activeGroup.files.filter(f => f.type === (isImage ? 'image' : 'video'));
        const nextIndex = currentFilesOfType.length + 1;
        const formattedIndex = nextIndex.toString().padStart(2, '0');
        const extension = file.name.substring(file.name.lastIndexOf('.')) || (isImage ? '.jpg' : '.mp4');
        
        // Auto-renamed file name, e.g., G1_01.jpg
        const autoName = `${activeGroup.id}_${formattedIndex}${extension}`;

        const newFileObj: GroupFile = {
          id: Math.random().toString(36).substring(2, 9),
          name: autoName,
          originalName: file.name,
          type: isImage ? 'image' : 'video',
          mimeType: file.type,
          size: file.size,
          dataUrl: dataUrl
        };

        setGroups(prev => prev.map(g => {
          if (g.id.toUpperCase() === activeGroupId.toUpperCase()) {
            return {
              ...g,
              files: [...g.files, newFileObj]
            };
          }
          return g;
        }));

        setPasteOverlayActive(true);
        setTimeout(() => setPasteOverlayActive(false), 800);
        showNotification(`✅ Ativo salvo: ${autoName}`);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      showNotification("Erro ao processar arquivo");
    }
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      handleFileSave(files[i]);
    }
    e.target.value = '';
  };

  // Remove a text snippet from specified project
  const handleDeleteText = (projId: string, index: number) => {
    setGroups(prev => prev.map(g => {
      if (g.id === projId) {
        const nextTexts = [...g.texts];
        nextTexts.splice(index, 1);
        return { ...g, texts: nextTexts };
      }
      return g;
    }));
    showNotification("Texto removido.");
  };

  // Delete a media asset and reindex remaining files so they preserve exact continuous numbers
  const handleDeleteFile = (projId: string, fileId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === projId) {
        const filtered = g.files.filter(f => f.id !== fileId);
        
        // Re-index images and videos separately to maintain perfect continuous G1_01, G1_02 sequence
        const imgs = filtered.filter(f => f.type === 'image');
        const vids = filtered.filter(f => f.type === 'video');

        const reindexedImgs = imgs.map((item, index) => {
          const extension = item.name.substring(item.name.lastIndexOf('.')) || '.jpg';
          return {
            ...item,
            name: `${projId}_${(index + 1).toString().padStart(2, '0')}${extension}`
          };
        });

        const reindexedVids = vids.map((item, index) => {
          const extension = item.name.substring(item.name.lastIndexOf('.')) || '.mp4';
          return {
            ...item,
            name: `${projId}_${(index + 1).toString().padStart(2, '0')}${extension}`
          };
        });

        return {
          ...g,
          files: [...reindexedImgs, ...reindexedVids]
        };
      }
      return g;
    }));
    showNotification("Ativo de mídia removido.");
  };

  // Delete an entire project with confirmation
  const handleDeleteProject = (projId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (groups.length <= 1) {
      showNotification("Você precisa manter pelo menos um projeto ativo!");
      return;
    }
    if (confirm(`Deseja mesmo excluir definitivamente o projeto ${projId}?`)) {
      const nextGroups = groups.filter(g => g.id !== projId);
      setGroups(nextGroups);
      if (activeGroupId === projId) {
        setActiveGroupId(nextGroups[0].id);
      }
      showNotification(`Projeto ${projId} deletado.`);
    }
  };

  // Reset entire dashboard
  const handleResetApplication = () => {
    if (confirm("Deseja redefinir todo o sistema para os valores padrão de fábrica?")) {
      localStorage.removeItem('social_post_organizer_groups_v2');
      localStorage.removeItem('social_post_organizer_active_id_v2');
      window.location.reload();
    }
  };

  // Copy individual text block
  const handleCopySingleText = async (text: string) => {
    await copyToClipboard(text);
    showNotification("Texto copiado para a Área de Transferência! 📋");
  };

  // Merges all texts formatted cleanly and copies to clipboard in one touch
  const handleCopyAllTexts = async () => {
    if (!activeGroup || activeGroup.texts.length === 0) {
      showNotification("Nenhum texto copiado ainda neste projeto!");
      return;
    }
    const combined = activeGroup.texts.join('\n\n');
    await copyToClipboard(combined);
    showNotification("Todos os textos copiados juntos! 🔗");
  };

  // Helper file downloading for simulated G1/textos.db
  const handleDownloadTextosDbFile = (group: ProductGroup) => {
    const content = group.texts.join('\n\n');
    downloadFile(content, `${group.id}_textos.db`, 'text/plain');
    showNotification("Banco textos.db baixado com sucesso! 📄");
  };

  // Filter groups in sidebar/history list by ID
  const filteredGroups = groups.filter(g => 
    g.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Drag and drop mechanics for simulated social share previewing
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedFileId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOverSocial = (e: React.DragEvent, platform: string) => {
    e.preventDefault();
    setActiveSocialDropZone(platform);
  };

  const handleDropSocial = (e: React.DragEvent, platform: string) => {
    e.preventDefault();
    setActiveSocialDropZone(null);
    const id = e.dataTransfer.getData('text/plain') || draggedFileId;
    if (!id || !activeGroup) return;

    const file = activeGroup.files.find(f => f.id === id);
    if (file) {
      setSocialModalPreview({
        open: true,
        platform,
        fileUrl: file.dataUrl,
        fileName: file.name,
        caption: activeGroup.texts.join('\n\n')
      });
      showNotification(`Ativo solto com sucesso no canal ${platform.toUpperCase()}! 🚀`);
    }
  };

  // Quick click handler in lieu of drag
  const handleShareClick = (platform: string, file: GroupFile) => {
    setSocialModalPreview({
      open: true,
      platform,
      fileUrl: file.dataUrl,
      fileName: file.name,
      caption: activeGroup.texts.join('\n\n')
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col relative overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Upper Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-md shadow-blue-200">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-2">
              <span>Projetor de Produtos Afiliados</span>
              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">v2.0 PRO</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Captura automática e organização instantânea</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setShowNewProjectModal(true)}
            id="start-new-project-btn"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-blue-100 transition-all hover:scale-[1.03] active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>NOVO PROJETO</span>
          </button>

          <button 
            onClick={handleResetApplication}
            title="Redefinir aplicativo"
            className="border border-slate-200 hover:bg-slate-50 p-2.5 rounded-xl text-slate-400 hover:text-red-500 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container Dashboard */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column - History & Project Searching File Tree (4/12 grid) */}
        <section className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4 self-stretch">
          
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <FolderOpen className="w-4.5 h-4.5 text-blue-600" />
              <span>DIRETÓRIO DE PROJETOS</span>
            </h2>
            <span className="text-[11px] font-bold text-slate-400 bg-slate-105 px-2 py-0.5 rounded-md">
              {groups.length} ativos
            </span>
          </div>

          {/* Search por ID input field */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Pesquisar por ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-650 transition font-medium"
            />
          </div>

          <p className="text-[11px] text-slate-500 italic">
            💡 Dica: Clique no projeto para abrir ou use o botão <b>Novo Projeto</b> para iniciar um novo ID.
          </p>

          {/* List of projects history list with folder representation */}
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[480px] pr-1">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Folder className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400">Nenhum projeto encontrado</p>
                <p className="text-[10px] text-slate-400">Digite outro ID de busca</p>
              </div>
            ) : (
              filteredGroups.map(project => {
                const isActive = project.id.toUpperCase() === activeGroupId.toUpperCase();
                const textCount = project.texts.length;
                const mediaCount = project.files.length;

                return (
                  <div
                    key={project.id}
                    onClick={() => setActiveGroupId(project.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                      isActive 
                        ? 'bg-blue-50/80 border-blue-200/80 hover:bg-blue-50 shadow-xs ring-1 ring-blue-500/10' 
                        : 'bg-white border-slate-100 hover:border-slate-204 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl transition ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-slate-102 text-slate-500'
                      }`}>
                        <Folder className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900 uppercase">
                            {project.id}
                          </span>
                          {isActive && (
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-semibold">
                          <span className="flex items-center gap-0.5">
                            <FileText className="w-3 h-3 text-slate-400" /> {textCount} textos
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <ImageIcon className="w-3 h-3 text-slate-400" /> {mediaCount} mídias
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadSingleGroupZip(project);
                        }}
                        title="Baixar ZIP do Projeto"
                        className="p-1.5 rounded-lg hover:bg-white border border-transparent text-slate-400 hover:text-blue-600 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        title="Deletar Projeto"
                        className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-100 pt-3.5 flex flex-col gap-2">
            <button 
              onClick={() => downloadAllGroupsZip(groups)}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-xl py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-slate-900/10"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Todos em .ZIP</span>
            </button>
            <p className="text-[10px] leading-relaxed text-slate-400 font-medium text-center">
              A exportação empacota todos os diretórios dentro da pasta <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">Produtos/</code> contendo <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">textos.db</code> para cada.
            </p>
          </div>

        </section>

        {/* Center / Right Column - Dynamic Active Project Board (8/12 grid) */}
        <section className="lg:col-span-8 flex flex-col gap-6">

          {/* Active Product Banner Identification */}
          {activeGroup ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="bg-gradient-to-tr from-blue-600 to-blue-500 p-3.5 rounded-2xl text-white shadow-md shadow-blue-200 shrink-0">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] font-bold text-blue-600 bg-blue-100 px-2.5 py-0.5 rounded-full tracking-wider uppercase">Ativo</span>
                    <span className="text-xs text-slate-400 font-semibold">Caminho: Projetos/{activeGroup.id}/</span>
                  </div>
                  <h2 className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-2 mt-1 uppercase">
                    ID: {activeGroup.id}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownloadTextosDbFile(activeGroup)}
                  className="bg-slate-50 border border-slate-205 hover:bg-slate-100/80 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-tight transition flex items-center gap-1.5 cursor-pointer"
                  title="Baixa arquivo de logs de textos"
                >
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Baixar textos.db</span>
                </button>
                
                <button 
                  onClick={() => downloadSingleGroupZip(activeGroup)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-100 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar ZIP do ID</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50/50 p-6 rounded-2xl text-center border border-dashed border-blue-200">
              <p className="text-sm font-bold text-blue-600">Nenhum projeto ativo selecionado</p>
              <button 
                onClick={() => setShowNewProjectModal(true)}
                className="mt-2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-xl"
              >
                Criar Projeto
              </button>
            </div>
          )}

          {/* Quick Paste Capture console for Sandboxed Browsers / Keyboard Listeners */}
          {activeGroup && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5.5 h-5.5 text-amber-500 animate-pulse" />
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Mesa de Captura Automática</h3>
                  <p className="text-[10px] text-slate-500">Qualquer texto copiado com <b>Ctrl + C</b> ou arquivo recebido cai aqui direto!</p>
                </div>
              </div>

              {/* Simple workspace paste manual input with drag options */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Text Fast Capture Console Input (7/12 area) */}
                <div className="md:col-span-8 flex flex-col gap-2">
                  <div className="relative">
                    <textarea
                      placeholder="Cole textos de divulgação aqui (Ctrl+V) ou digite para salvar no projeto ativo..."
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          addTextToActiveProject(manualText);
                          setManualText('');
                        }
                      }}
                      className="w-full text-xs p-3.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-220 focus:border-blue-600 rounded-xl focus:outline-none transition min-h-[90px] font-sans h-24"
                    />
                    <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          if (manualText.trim()) {
                            addTextToActiveProject(manualText);
                            setManualText('');
                          }
                        }}
                        title="Enviar registro"
                        aria-label="Registrar texto"
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold transition-all shadow shadow-blue-500/10 cursor-pointer"
                      >
                        <Plus className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10.5px] text-slate-500">
                    <span>💡 Pressionar <kbd className="bg-slate-100 border px-1 rounded text-slate-600 font-bold font-mono">Enter</kbd> salva o texto instantaneamente.</span>
                    <button 
                      onClick={async () => {
                        const read = await navigator.clipboard.readText().catch(() => '');
                        if (read) {
                          addTextToActiveProject(read);
                        } else {
                          showNotification("⚠️ Cole diretamente na caixa.");
                        }
                      }}
                      className="text-blue-600 font-extrabold hover:underline"
                    >
                      Processar Área de Transferência
                    </button>
                  </div>
                </div>

                {/* Media Import Zone Container (5/12 area) */}
                <div className="md:col-span-4 flex flex-col justify-between border-2 border-dashed border-slate-200 rounded-2xl p-4 hover:bg-slate-50/50 hover:border-blue-400 transition cursor-pointer relative group-upload">
                  <input 
                    type="file" 
                    multiple
                    accept="image/*,video/*"
                    onChange={handleManualUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    title="Selecione imagens ou vídeos"
                  />
                  <div className="text-center py-2">
                    <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2 group-hover:scale-110 transition duration-200" />
                    <p className="text-xs font-bold text-slate-700">Baixou Mídias?</p>
                    <p className="text-[10px] text-slate-500 mt-1">Arraste ou clique para salvar em {activeGroup.id}</p>
                  </div>
                  <div className="flex gap-2 justify-center mt-1">
                    <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold flex items-center gap-0.5">
                      <ImageIcon className="w-2.5 h-2.5" /> Imagens
                    </span>
                    <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold flex items-center gap-0.5">
                      <VideoIcon className="w-2.5 h-2.5" /> Vídeos
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Dynamic Active Group Elements Panel: Textos, Imagens, Vídeos */}
          {activeGroup && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Left Segment: Textos List - textos.db (7/12 column) */}
              <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col">
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-blue-600" />
                    <span>TEXTOS CAPTURADOS ({activeGroup.id}/textos.db)</span>
                  </h3>
                  
                  {activeGroup.texts.length > 0 && (
                    <button 
                      onClick={handleCopyAllTexts}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10.5px] font-extrabold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Tudo</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto flex-1 pr-1">
                  {activeGroup.texts.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-slate-100 rounded-xl bg-slate-50/40">
                      <Clipboard className="w-8 h-8 text-slate-350 mx-auto mb-2 animate-pulse" />
                      <p className="text-xs font-bold text-slate-500">Nenhum texto copiado ainda</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                        Qualquer texto copiado do navegador com Ctrl+C será salvo aqui automaticamente.
                      </p>
                    </div>
                  ) : (
                    activeGroup.texts.map((text, idx) => (
                      <div 
                        key={idx}
                        className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl hover:border-slate-205 hover:bg-white transition flex items-start gap-3 relative group"
                      >
                        <span className="font-mono text-[9px] font-extrabold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md mt-0.5 shrink-0 select-none">
                          #{idx + 1}
                        </span>
                        
                        <p className="text-xs text-slate-800 leading-relaxed font-medium select-all break-words pr-12 whitespace-pre-wrap flex-1">
                          {text}
                        </p>

                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                          <button
                            onClick={() => handleCopySingleText(text)}
                            title="Copiar texto"
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 p-1.5 rounded-lg transition shadow-xs"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteText(activeGroup.id, idx)}
                            title="Remover texto"
                            className="bg-white border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-500 p-1.5 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>

              {/* Right Segment: Imagens & Vídeos List (5/12 column) */}
              <div className="xl:col-span-5 flex flex-col gap-6">
                
                {/* Imagens Panel */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <h3 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-4.5 h-4.5 text-blue-600" />
                    <span>IMAGENS DE {activeGroup.id}</span>
                  </h3>

                  <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                    {activeGroup.files.filter(f => f.type === 'image').length === 0 ? (
                      <div className="text-center py-8 bg-slate-50/40 border border-dashed border-slate-100 rounded-xl">
                        <ImageIcon className="w-7 h-7 text-slate-350 mx-auto mb-1 ml-auto" />
                        <p className="text-[11px] font-bold text-slate-500">Sem imagens neste ID</p>
                        <p className="text-[9.5px] text-slate-400">Arraste arquivos e baixará aqui</p>
                      </div>
                    ) : (
                      activeGroup.files.filter(f => f.type === 'image').map(file => (
                        <div 
                          key={file.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, file.id)}
                          className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2 rounded-xl group hover:bg-white hover:border-slate-200 transition relative"
                        >
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0 relative flex items-center justify-center">
                            <img 
                              src={file.dataUrl} 
                              alt={file.name} 
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover" 
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-extrabold text-slate-800 break-all select-all flex items-center gap-1">
                              <span>{file.name}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold">{formatSize(file.size)}</p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => handleShareClick('instagram', file)}
                              title="Compartilhar mídias"
                              className="p-1 rounded bg-white border hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFile(activeGroup.id, file.id)}
                              title="Deletar imagem"
                              className="p-1 rounded bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 transition border"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="absolute left-2 -bottom-2 bg-slate-900 text-white text-[8px] font-bold px-1 py-[1.5px] rounded select-none shadow-xs pointer-events-none opacity-0 group-hover:opacity-90 transition">
                            ARRASTÁVEL 🫳
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Vídeos Panel */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <h3 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
                    <VideoIcon className="w-4.5 h-4.5 text-blue-600" />
                    <span>VÍDEOS DE {activeGroup.id}</span>
                  </h3>

                  <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                    {activeGroup.files.filter(f => f.type === 'video').length === 0 ? (
                      <div className="text-center py-8 bg-slate-50/40 border border-dashed border-slate-100 rounded-xl">
                        <VideoIcon className="w-7 h-7 text-slate-350 mx-auto mb-1 ml-auto" />
                        <p className="text-[11px] font-bold text-slate-500">Sem vídeos neste ID</p>
                        <p className="text-[9.5px] text-slate-400">Arraste vídeos gravados ou cole</p>
                      </div>
                    ) : (
                      activeGroup.files.filter(f => f.type === 'video').map(file => (
                        <div 
                          key={file.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, file.id)}
                          className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2 rounded-xl group hover:bg-white hover:border-slate-200 transition relative"
                        >
                          <div className="w-11 h-11 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200">
                            <VideoIcon className="w-5.5 h-5.5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-extrabold text-slate-800 break-all select-all flex items-center gap-1">
                              <span>{file.name}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold">{formatSize(file.size)}</p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => handleShareClick('whatsapp', file)}
                              className="p-1 rounded bg-white hover:bg-slate-50 text-slate-500 border hover:text-blue-600 transition"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFile(activeGroup.id, file.id)}
                              className="p-1 rounded bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 transition border"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="absolute left-2 -bottom-2 bg-slate-900 text-white text-[8px] font-bold px-1 py-[1.5px] rounded select-none shadow-xs pointer-events-none opacity-0 group-hover:opacity-90 transition">
                            ARRASTÁVEL 🫳
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Social Networks Media Drag Targets (Simulated Post Slots) */}
          {activeGroup && (
            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg overflow-hidden relative">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 bg-blue-600 w-36 h-36 rounded-full filter blur-3xl opacity-20" />
              
              <div className="mb-4">
                <span className="text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full uppercase tracking-widest">Canal de Divulgação Direct</span>
                <h3 className="text-sm font-extrabold tracking-tight text-white mt-1.5 flex items-center gap-2">
                  <span>ARRASTAR MÍDIAS DIRETAMENTE PARA AS REDES</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium">Pegue qualquer arquivo renomeado do ID acima e solte-o em uma das redes abaixo:</p>
              </div>

              {/* Grid of platform drop targets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* WhatsApp */}
                <div 
                  onDragOver={(e) => handleDragOverSocial(e, 'whatsapp')}
                  onDragLeave={() => setActiveSocialDropZone(null)}
                  onDrop={(e) => handleDropSocial(e, 'whatsapp')}
                  onClick={() => activeGroup.files[0] && handleShareClick('whatsapp', activeGroup.files[0])}
                  className={`border-2 rounded-2xl p-4 transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    activeSocialDropZone === 'whatsapp' 
                      ? 'border-emerald-500 bg-emerald-550/20 scale-105' 
                      : 'border-slate-800 bg-slate-800/45 hover:border-slate-700 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="bg-emerald-500/10 text-emerald-500 p-2.5 rounded-full">
                    <MessageSquare className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">WhatsApp Promo</p>
                    <p className="text-[9px] text-slate-450">Solte para copiar legenda</p>
                  </div>
                </div>

                {/* Instagram */}
                <div 
                  onDragOver={(e) => handleDragOverSocial(e, 'instagram')}
                  onDragLeave={() => setActiveSocialDropZone(null)}
                  onDrop={(e) => handleDropSocial(e, 'instagram')}
                  onClick={() => activeGroup.files[0] && handleShareClick('instagram', activeGroup.files[0])}
                  className={`border-2 rounded-2xl p-4 transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    activeSocialDropZone === 'instagram' 
                      ? 'border-pink-500 bg-pink-550/20 scale-105' 
                      : 'border-slate-800 bg-slate-800/45 hover:border-slate-700 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="bg-pink-500/10 text-pink-500 p-2.5 rounded-full">
                    <Instagram className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Instagram Reels</p>
                    <p className="text-[9px] text-slate-450">Solte para carregar áudio</p>
                  </div>
                </div>

                {/* TikTok */}
                <div 
                  onDragOver={(e) => handleDragOverSocial(e, 'tiktok')}
                  onDragLeave={() => setActiveSocialDropZone(null)}
                  onDrop={(e) => handleDropSocial(e, 'tiktok')}
                  onClick={() => activeGroup.files[0] && handleShareClick('tiktok', activeGroup.files[0])}
                  className={`border-2 rounded-2xl p-4 transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    activeSocialDropZone === 'tiktok' 
                      ? 'border-indigo-500 bg-indigo-550/20 scale-105' 
                      : 'border-slate-800 bg-slate-800/45 hover:border-slate-700 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-full">
                    <Share2 className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Facebook Ads</p>
                    <p className="text-[9px] text-slate-450">Fácil integração</p>
                  </div>
                </div>

                {/* Pinterest */}
                <div 
                  onDragOver={(e) => handleDragOverSocial(e, 'pinterest')}
                  onDragLeave={() => setActiveSocialDropZone(null)}
                  onDrop={(e) => handleDropSocial(e, 'pinterest')}
                  onClick={() => activeGroup.files[0] && handleShareClick('pinterest', activeGroup.files[0])}
                  className={`border-2 rounded-2xl p-4 transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    activeSocialDropZone === 'pinterest' 
                      ? 'border-rose-500 bg-rose-550/20 scale-105' 
                      : 'border-slate-800 bg-slate-800/45 hover:border-slate-700 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="bg-rose-550/10 text-rose-500 p-2.5 rounded-full">
                    <Globe className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Pinterest Pins</p>
                    <p className="text-[9px] text-slate-450">Salvamento automático</p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Computer Hard Storage Structure Simulation Map */}
          {activeGroup && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wide">ESTRUTURA FÍSICA GERADA NO COMPUTADOR</h3>
                    <p className="text-[10px] text-slate-500">Representação visual do diretório físico criado na raiz</p>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-100 hover:bg-slate-200/80 text-slate-600 font-bold px-2.5 py-1 rounded-lg">
                  Formatos de ativos preservados (.jpg, .mp4, db)
                </span>
              </div>

              {/* Dynamic Simulated Folder Tree map directory */}
              <div className="bg-slate-900 rounded-xl p-5 text-slate-300 font-mono text-xs shadow-inner overflow-x-auto">
                <p className="text-blue-400 font-extrabold">📁 Projetos/</p>
                {groups.map((group, projIdx) => {
                  const isCurActive = group.id.toUpperCase() === activeGroupId.toUpperCase();
                  const lastProj = projIdx === groups.length - 1;

                  return (
                    <div key={group.id} className="pl-4">
                      <div className="flex items-center gap-1.5 py-1">
                        <span>{lastProj ? '└──' : '├──'}</span>
                        <span className={`flex items-center gap-1 ${isCurActive ? 'text-green-400 font-bold' : 'text-amber-400'}`}>
                          <span>📁 {group.id}/</span>
                          {isCurActive && <span className="text-[9px] bg-green-500/20 text-green-400 px-1 py-[1px] rounded font-sans">ATIVO</span>}
                        </span>
                      </div>
                      
                      {/* Inside Project texts.db */}
                      <div className="pl-8 flex items-center gap-1.5 py-[2px] text-slate-400 hover:text-white transition">
                        <span>{group.files.length === 0 ? '└──' : '├──'}</span>
                        <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="underline cursor-pointer" onClick={() => handleDownloadTextosDbFile(group)}>textos.db</span>
                        <span className="text-[9px] text-slate-500 font-sans ml-2">(Sincronizado: {group.texts.length} linhas)</span>
                      </div>

                      {/* Inside Project files renamed */}
                      {group.files.map((file, fileIdx) => {
                        const isLastFile = fileIdx === group.files.length - 1;
                        return (
                          <div key={file.id} className="pl-8 flex items-center gap-1.5 py-[2px] text-slate-450 hover:text-white transition">
                            <span>{isLastFile ? '└──' : '├──'}</span>
                            {file.type === 'image' ? (
                              <FileImage className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            ) : (
                              <FileVideo className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            )}
                            <span className="select-all">{file.name}</span>
                            <span className="text-[8.5px] text-slate-600 font-sans ml-2">({formatSize(file.size)})</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

            </div>
          )}

        </section>

      </main>

      {/* Floating auto-save screen flash indicator */}
      <AnimatePresence>
        {pasteOverlayActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-blue-600 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white text-base font-bold flex flex-col items-center gap-3">
              <Clipboard className="w-10 h-10 text-white animate-bounce" />
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-400">Captura Automática Executada</p>
              <p className="text-xs text-slate-350">Novo bloco sincronizado em /Projetos/{activeGroupId}/</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialog overlay and trigger for creating "Novo Projeto" with only ID inputs */}
      <AnimatePresence>
        {showNewProjectModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[9px] font-bold bg-blue-550/20 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-widest leading-none">Novo Ativo</span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">INICIAR NOVO PROJETO</h3>
                </div>
                <button 
                  onClick={() => {
                    setShowNewProjectModal(false);
                    setNewProjectIdInput('');
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-400 p-1.5 rounded-full select-none outline-none"
                >
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateNewProject(newProjectIdInput);
              }} className="space-y-4">
                <div>
                  <label htmlFor="proj-id-subfield" className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">ID do Produto (Ex: F1, G1, GELADEIRA, FOGAO):</label>
                  <input
                    type="text"
                    id="proj-id-subfield"
                    placeholder="Digite o ID/Nome do produto..."
                    autoFocus
                    required
                    value={newProjectIdInput}
                    onChange={(e) => setNewProjectIdInput(e.target.value)}
                    className="w-full p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-xs font-bold uppercase transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-relaxed">
                    Você informa apenas o ID. Uma nova pasta será criada na raiz <code className="bg-slate-100 p-0.5 rounded text-blue-600 font-bold">Projetos/{newProjectIdInput || 'SUA_PASTA'}</code> para organizar todos os textos (<code className="font-bold">textos.db</code>), imagens e vídeos deste item automaticamente.
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewProjectModal(false);
                      setNewProjectIdInput('');
                    }}
                    className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-650 font-bold text-xs px-4 py-2 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4.5 py-2 rounded-xl shadow-md transition"
                  >
                    Iniciar Projeto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Social Network Share/Dropped preview modal */}
      <AnimatePresence>
        {socialModalPreview && socialModalPreview.open && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-600 text-white p-2 rounded-full font-bold text-xs">🚀</div>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-300">PREVIEW SIMULADO: {socialModalPreview.platform.toUpperCase()}</h3>
                </div>
                <button 
                  onClick={() => setSocialModalPreview(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-400 p-1 rounded-full text-xs"
                >
                  <Plus className="w-4.5 h-4.5 rotate-45" />
                </button>
              </div>

              <div className="space-y-4">
                
                {/* Media representation */}
                <div className="bg-slate-950 rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center border border-slate-800">
                  {socialModalPreview.fileUrl ? (
                    <img 
                      src={socialModalPreview.fileUrl} 
                      alt="Ativo" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain" 
                    />
                  ) : (
                    <div className="text-center p-4 text-slate-500 font-mono text-xs">
                      [Vídeo pronto para transmissão]
                    </div>
                  )}
                  <div className="absolute left-3 bottom-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded">
                    Arquivo: {socialModalPreview.fileName}
                  </div>
                </div>

                {/* Copied Caption texts box */}
                <div>
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Fórmula de Legenda integrada</h4>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 max-h-[140px] overflow-y-auto text-slate-300 scrollbar-thin text-xs leading-relaxed whitespace-pre-wrap">
                    {socialModalPreview.caption || "(Nenhum texto copiado ainda)"}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  💡 A legenda e a mídia já estão em conformidade e reformatadas para os formatos de Stories/Reels do {socialModalPreview.platform}.
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    onClick={() => {
                      if (socialModalPreview.caption) {
                        copyToClipboard(socialModalPreview.caption);
                        showNotification("Legenda copiada para área de transferência!");
                      }
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
                  >
                    Copiar Capa/Legenda
                  </button>
                  <button 
                    onClick={() => {
                      showNotification("Disparado e publicado automaticamente com sucesso!");
                      setSocialModalPreview(null);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4.5 py-2.5 rounded-xl transition shadow"
                  >
                    Confirmar Envio
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Small toast status feedback */}
      <AnimatePresence>
        {copiedNotification && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed bottom-5 right-5 bg-slate-900 border border-slate-800 text-white py-3 px-5 rounded-2xl shadow-xl z-50 text-xs font-bold flex items-center gap-2"
          >
            <div className="bg-emerald-500 rounded-full p-1 text-slate-950 text-[10px]">✔</div>
            <span>{copiedNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

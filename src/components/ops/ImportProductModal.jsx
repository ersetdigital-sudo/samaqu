"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/lib/ops-api";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileSpreadsheet, Check, AlertCircle, Download, Loader2 } from "lucide-react";
import { useToast } from "@/components/ops/ui/use-toast";

export default function ImportProductModal({ isOpen, onClose }) {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const downloadTemplate = () => {
    const headers = "sku,name,hpp,price,initial_stock,status,product_type";
    const sample = "SKU001,Contoh Produk,10000,15000,100,aman,normal\nSKU002,Produk Gift,5000,0,50,aman,free_gift";
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + sample;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_import_produk.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
    const result = [];
    
    for(let i=1; i<lines.length; i++){
      // Handle simple CSV split, respecting quotes would be better but complex without library
      const currentLine = lines[i].split(',');
      
      if(currentLine.length >= headers.length){ // Allow loose matching if extra cols exist
        const obj = {};
        headers.forEach((header, index) => {
          if (currentLine[index] !== undefined) {
            let val = currentLine[index].trim().replace(/"/g, '');
            
            // Numeric fields
            if (['hpp', 'price', 'initial_stock', 'stock'].includes(header)) {
               val = parseInt(val.replace(/\D/g, '')) || 0;
            }
            
            obj[header] = val;
          }
        });
        
        // Derived fields if missing
        if (obj.stock === undefined && obj.initial_stock !== undefined) {
            obj.stock = obj.initial_stock;
        }
        if (!obj.status && obj.stock !== undefined) {
            obj.status = obj.stock === 0 ? 'habis' : obj.stock <= 5 ? 'menipis' : 'aman';
        }
        if (!obj.product_type) {
            obj.product_type = 'normal';
        }

        result.push(obj);
      }
    }
    return result;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (file) => {
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      toast({
        title: "Format salah",
        description: "Harap upload file CSV",
        variant: "destructive"
      });
      return;
    }

    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const data = parseCSV(text);
      setPreviewData(data);
    };
    reader.readAsText(file);
  };

  const importMutation = useMutation({
    mutationFn: async (products) => {
      // Using sequential create if bulkCreate isn't reliable or for better error handling per item
      // But prompt says bulkCreate exists. Let's try bulkCreate first for efficiency.
      // If bulkCreate is not standard in the provided SDK description, I'll loop.
      // The SDK description examples show: base44.entities.Todo.bulkCreate(...)
      
      // Process in chunks of 50 to be safe
      const chunkSize = 50;
      for (let i = 0; i < products.length; i += chunkSize) {
        const chunk = products.slice(i, i + chunkSize);
        await base44.entities.Product.bulkCreate(chunk);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast({
        title: "â Import Berhasil",
        description: `${previewData.length} produk berhasil diimport`,
        variant: "success"
      });
      handleClose();
    },
    onError: (error) => {
      console.error("Import error:", error);
      toast({
        title: "â Import Gagal",
        description: "Terjadi kesalahan saat mengimport data. Pastikan format sesuai.",
        variant: "destructive"
      });
    }
  });

  const handleImport = () => {
    if (previewData.length === 0) return;
    importMutation.mutate(previewData);
  };

  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <FileSpreadsheet className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white font-jakarta">Import Produk</h2>
                <p className="text-blue-100 text-xs">Upload file CSV sesuai template</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-white/80 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {!file ? (
              <div className="space-y-4">
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const droppedFile = e.dataTransfer.files[0];
                    if (droppedFile) processFile(droppedFile);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".csv" 
                    onChange={handleFileChange}
                  />
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="text-blue-600" size={28} />
                  </div>
                  <h3 className="text-gray-900 font-bold mb-1">Klik atau drop file CSV di sini</h3>
                  <p className="text-gray-500 text-sm">Mendukung format .csv</p>
                </div>

                <div className="flex justify-center">
                  <button 
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-semibold bg-blue-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Download size={16} />
                    Download Template CSV
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                      CSV
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{file.name}</p>
                      <p className="text-gray-500 text-xs">{(file.size / 1024).toFixed(2)} KB â¢ {previewData.length} Baris Data</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setFile(null); setPreviewData([]); }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                      <tr>
                        <th className="px-4 py-2">SKU</th>
                        <th className="px-4 py-2">Nama</th>
                        <th className="px-4 py-2 text-right">HPP</th>
                        <th className="px-4 py-2 text-right">Harga</th>
                        <th className="px-4 py-2 text-center">Stok</th>
                        <th className="px-4 py-2 text-center">Tipe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {previewData.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="bg-white hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{row.sku}</td>
                          <td className="px-4 py-2">{row.name}</td>
                          <td className="px-4 py-2 text-right">{row.hpp?.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right">{row.price?.toLocaleString()}</td>
                          <td className="px-4 py-2 text-center">{row.initial_stock}</td>
                          <td className="px-4 py-2 text-center">
                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${row.product_type === 'free_gift' ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-600'}`}>
                               {row.product_type === 'free_gift' ? 'Gift' : 'Norm'}
                             </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 5 && (
                    <div className="bg-gray-50 px-4 py-2 text-center text-xs text-gray-500 border-t">
                      + {previewData.length - 5} produk lainnya
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
            <button 
              onClick={handleClose}
              className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors text-sm"
            >
              Batal
            </button>
            <button 
              onClick={handleImport}
              disabled={!file || previewData.length === 0 || importMutation.isPending}
              className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Mengimport...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Import {previewData.length} Produk
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
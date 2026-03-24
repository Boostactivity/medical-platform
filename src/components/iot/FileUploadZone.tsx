/**
 * Zone upload fichiers machine (ResMed, Philips, Löwenstein)
 * Détection automatique format + Upload
 */

import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface UploadResult {
  success: boolean;
  sessionsProcessed: number;
  scoresCalculated: number;
  alertsCreated: number;
  summary?: any;
  error?: string;
}

interface FileUploadZoneProps {
  patientId: string;
  onUploadComplete?: (result: UploadResult) => void;
}

export function FileUploadZone({ patientId, onUploadComplete }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);

  // Détecter format fichier
  const detectFormat = async (content: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/iot/detect-format`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileContent: content }),
        }
      );

      const data = await response.json();
      return data.format;
    } catch (error) {
      console.error('Error detecting format:', error);
      return 'unknown';
    }
  };

  // Upload fichier
  const uploadFile = async (content: string, format: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-50732e52/iot/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileContent: content,
            patientId,
            format: format !== 'unknown' ? format : undefined,
          }),
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        return { success: true, ...data };
      } else {
        return { success: false, error: data.error || 'Upload failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Gérer fichier
  const handleFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadResult(null);
    setDetectedFormat(null);

    try {
      // Lire fichier
      const content = await file.text();

      // Détecter format
      const format = await detectFormat(content);
      setDetectedFormat(format);

      if (format === 'unknown') {
        setUploadResult({
          success: false,
          error: 'Format de fichier non reconnu. Formats supportés: ResMed (JSON), Philips (CSV), Löwenstein (XML)',
          sessionsProcessed: 0,
          scoresCalculated: 0,
          alertsCreated: 0,
        });
        setIsUploading(false);
        return;
      }

      // Upload
      const result = await uploadFile(content, format);
      setUploadResult(result);
      
      if (result.success && onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (error: any) {
      setUploadResult({
        success: false,
        error: error.message,
        sessionsProcessed: 0,
        scoresCalculated: 0,
        alertsCreated: 0,
      });
    } finally {
      setIsUploading(false);
    }
  }, [patientId, onUploadComplete]);

  // Drag & Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  // File input handler
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Zone de drop */}
      <div
        className={`
          relative border-2 border-dashed rounded-3xl p-12 transition-all
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}
          ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-blue-400 hover:bg-blue-50/50'}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileInput}
          accept=".json,.csv,.xml"
          disabled={isUploading}
        />

        <label 
          htmlFor="file-upload" 
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          {isUploading ? (
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />
          ) : (
            <Upload className="w-16 h-16 text-gray-400 mb-4" />
          )}

          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {isUploading ? 'Traitement en cours...' : 'Déposez votre fichier ici'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            ou cliquez pour parcourir
          </p>

          <div className="flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200">
              ResMed (JSON)
            </span>
            <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200">
              Philips (CSV)
            </span>
            <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200">
              Löwenstein (XML)
            </span>
          </div>
        </label>
      </div>

      {/* Format détecté */}
      {detectedFormat && detectedFormat !== 'unknown' && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <FileText className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Format détecté: <span className="uppercase">{detectedFormat}</span>
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {detectedFormat === 'resmed' && 'Fichier JSON ResMed AirSense'}
              {detectedFormat === 'philips' && 'Fichier CSV Philips DreamStation'}
              {detectedFormat === 'lowenstein' && 'Fichier XML Löwenstein PrismaLine'}
            </p>
          </div>
        </div>
      )}

      {/* Résultat upload */}
      {uploadResult && (
        <div className={`
          p-6 rounded-2xl border-2
          ${uploadResult.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
          }
        `}>
          <div className="flex items-start gap-4">
            {uploadResult.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            )}

            <div className="flex-1">
              <h4 className={`font-semibold mb-2 ${
                uploadResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {uploadResult.success ? 'Import réussi !' : 'Erreur d\'import'}
              </h4>

              {uploadResult.success ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-green-700">Sessions</p>
                      <p className="text-2xl font-bold text-green-900">
                        {uploadResult.sessionsProcessed}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700">Scores calculés</p>
                      <p className="text-2xl font-bold text-green-900">
                        {uploadResult.scoresCalculated}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-green-700">Alertes</p>
                      <p className="text-2xl font-bold text-green-900">
                        {uploadResult.alertsCreated}
                      </p>
                    </div>
                  </div>

                  {uploadResult.summary && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <p className="text-sm text-green-800">
                        <span className="font-medium">Période:</span>{' '}
                        {new Date(uploadResult.summary.dateRange.from).toLocaleDateString('fr-FR')}
                        {' → '}
                        {new Date(uploadResult.summary.dateRange.to).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-sm text-green-800 mt-1">
                        <span className="font-medium">Fabricant:</span>{' '}
                        <span className="uppercase">{uploadResult.summary.manufacturer}</span>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-700">{uploadResult.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
        <h4 className="font-medium text-blue-900 mb-3">Comment obtenir vos données ?</h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="font-semibold mt-0.5">ResMed:</span>
            <span>Exportez depuis MyAir ou la carte SD de votre AirSense 10/11</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold mt-0.5">Philips:</span>
            <span>Exportez le rapport CSV depuis DreamMapper ou votre DreamStation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold mt-0.5">Löwenstein:</span>
            <span>Exportez depuis PrismaCloud ou votre appareil PrismaLine</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

import { useState, FormEvent, useRef } from 'react';
import { projectsApi, parseNLPDescription, NLPParseResult, NLPAssumption } from '../api/projects';
import { Mic, MicOff, Loader2, Upload, FileText, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type InputMode = 'manual' | 'nlp';
type DatasetSource = 'global' | 'india_JNARDDC';

export default function ProjectCreateModal({ isOpen, onClose, onSuccess }: ProjectCreateModalProps) {
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [nlpInput, setNlpInput] = useState('');
  const [nlpResult, setNlpResult] = useState<NLPParseResult | null>(null);
  const [isParsingNLP, setIsParsingNLP] = useState(false);
  
  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Document Upload State
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<{name: string, wordCount: number} | null>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    product_category: '',
    target_lifespan: '',
    is_designed_for_disassembly: false,
    dataset_source: 'india_JNARDDC' as DatasetSource,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNLPParse = async () => {
    if (!nlpInput.trim()) {
      setError('Please enter a description');
      return;
    }

    setIsParsingNLP(true);
    setError('');
    
    try {
      const result = await parseNLPDescription(nlpInput);
      setNlpResult(result);
      
      // Auto-fill form with parsed data
      if (result.parsed.project.product_category) {
        setFormData(prev => ({
          ...prev,
          product_category: result.parsed.project.product_category,
        }));
      }
      if (result.parsed.project.target_lifespan) {
        setFormData(prev => ({
          ...prev,
          target_lifespan: String(result.parsed.project.target_lifespan),
        }));
      }
      setFormData(prev => ({
        ...prev,
        is_designed_for_disassembly: result.parsed.project.is_designed_for_disassembly,
      }));
      
      // Use suggested project name from NLP parser
      if (result.parsed.suggested_name) {
        const suggestedName = result.parsed.suggested_name;
        setFormData(prev => ({
          ...prev,
          name: prev.name || suggestedName,
          description: nlpInput,
        }));
      } else if (result.parsed.materials.length > 0) {
        // Fallback to category + primary material
        const category = result.parsed.project?.product_category?.replace('_', ' ')?.replace(/\b\w/g, (c: string) => c.toUpperCase()) || '';
        const primaryMaterial = result.parsed.materials[0]?.material_name || '';
        setFormData(prev => ({
          ...prev,
          name: prev.name || (category ? `${category} - ${primaryMaterial}` : primaryMaterial),
          description: nlpInput,
        }));
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to parse description');
    } finally {
      setIsParsingNLP(false);
    }
  };

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please ensure you have granted permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(`${API_BASE}/ai/transcribe`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.text) {
        setNlpInput(prev => prev ? prev + ' ' + data.text : data.text);
      } else {
        console.error('Transcription failed:', data.detail);
        alert(data.detail || 'Failed to transcribe audio');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleVoiceButton = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Document Upload Handler
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['.pdf', '.docx', '.txt', '.csv', '.xlsx'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      setError('Unsupported file type. Please upload PDF, DOCX, TXT, CSV, or XLSX files.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    setIsUploadingDocument(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('auto_parse', 'false');

      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/parse-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.extracted_text) {
        setNlpInput(data.extracted_text);
        setUploadedDocument({
          name: file.name,
          wordCount: data.word_count
        });
      } else {
        setError(data.detail || 'Failed to parse document');
      }
    } catch (error) {
      console.error('Document upload error:', error);
      setError('Failed to upload document. Please try again.');
    } finally {
      setIsUploadingDocument(false);
      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
    }
  };

  const clearUploadedDocument = () => {
    setUploadedDocument(null);
    setNlpInput('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    setIsLoading(true);
    try {
      await projectsApi.create({
        name: formData.name,
        description: formData.description || undefined,
        product_category: formData.product_category || undefined,
        target_lifespan: formData.target_lifespan ? parseInt(formData.target_lifespan) : undefined,
        is_designed_for_disassembly: formData.is_designed_for_disassembly,
      });

      // Reset form and close modal
      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      product_category: '',
      target_lifespan: '',
      is_designed_for_disassembly: false,
      dataset_source: 'india_JNARDDC',
    });
    setNlpInput('');
    setNlpResult(null);
    setInputMode('manual');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New Project</h2>
          <p className="text-gray-600 mt-1">Start your Life Cycle Assessment</p>
          
          {/* Input Mode Toggle */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode('manual')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                inputMode === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📝 Manual Entry
            </button>
            <button
              type="button"
              onClick={() => setInputMode('nlp')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                inputMode === 'nlp'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <img src="/images/ai.png" alt="AI" className="w-4 h-4 inline mr-1" /> Smart Input (NLP)
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* NLP Input Mode */}
        {inputMode === 'nlp' && (
          <div className="p-6 bg-green-50 border-b border-green-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                <img src="/images/ai.png" alt="AI" className="w-5 h-5" /> Smart Input
              </h3>
              {/* Document Upload Button */}
              <div>
                <input
                  type="file"
                  ref={documentInputRef}
                  onChange={handleDocumentUpload}
                  accept=".pdf,.docx,.txt,.csv,.xlsx"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => documentInputRef.current?.click()}
                  disabled={isUploadingDocument || isParsingNLP}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition disabled:opacity-50"
                  title="Upload document (PDF, DOCX, TXT, CSV, XLSX)"
                >
                  {isUploadingDocument ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isUploadingDocument ? 'Parsing...' : 'Upload Doc'}
                </button>
              </div>
            </div>
            <p className="text-sm text-green-700 mb-3">
              Describe your product in natural language, use voice input, or upload a document.
            </p>
            
            {/* Uploaded Document Badge */}
            {uploadedDocument && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700 flex-1">
                  {uploadedDocument.name} ({uploadedDocument.wordCount} words)
                </span>
                <button
                  type="button"
                  onClick={clearUploadedDocument}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  value={nlpInput}
                  onChange={(e) => setNlpInput(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 pr-12 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={isTranscribing ? "Transcribing..." : isUploadingDocument ? "Extracting text..." : "Example: 10kg copper wire, PVC coated, used in a motor for 10 years"}
                  disabled={isParsingNLP || isTranscribing || isUploadingDocument}
                />
                <button
                  type="button"
                  onClick={handleVoiceButton}
                  disabled={isParsingNLP || isTranscribing || isUploadingDocument}
                  className={`absolute right-2 top-2 p-2 rounded-lg transition flex items-center justify-center ${
                    isRecording 
                      ? 'bg-red-500 text-white animate-pulse hover:bg-red-600' 
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isRecording ? 'Stop recording' : 'Voice input'}
                >
                  {isTranscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              </div>
              {isRecording && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  Recording... Click mic to stop
                </p>
              )}
              
              <button
                type="button"
                onClick={handleNLPParse}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:bg-green-300"
                disabled={isParsingNLP || !nlpInput.trim() || isTranscribing}
              >
                {isParsingNLP ? '⏳ Parsing...' : '✨ Parse Description'}
              </button>
            </div>

            {/* NLP Result Display */}
            {nlpResult && (
              <div className="mt-4 space-y-3">
                {/* Tokens */}
                <div className="bg-white p-3 rounded-lg border border-green-200">
                  <h4 className="font-medium text-gray-700 mb-2">📊 Parsed Tokens</h4>
                  <div className="flex flex-wrap gap-2">
                    {nlpResult.parsed.tokens.map((token, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          token.type === 'material' ? 'bg-blue-100 text-blue-700' :
                          token.type === 'quantity' ? 'bg-purple-100 text-purple-700' :
                          token.type === 'lifespan' ? 'bg-orange-100 text-orange-700' :
                          token.type === 'recycled_content' ? 'bg-green-100 text-green-700' :
                          token.type === 'category' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {token.type}: {token.material || token.value || token.values?.join(', ')}
                        {token.form && ` (${token.form})`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Detected Materials */}
                {nlpResult.parsed.materials.length > 0 && (
                  <div className="bg-white p-3 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-700">🔩 Detected Materials</h4>
                      {nlpResult.parsed.parsing_method && (
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          nlpResult.parsed.parsing_method === 'groq_llm' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {nlpResult.parsed.parsing_method === 'groq_llm' ? <><img src="/images/ai.png" alt="AI" className="w-3 h-3" /> AI</> : '📝 Regex'}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {nlpResult.parsed.materials.map((mat, idx) => (
                        <div key={idx} className="bg-gray-50 p-2 rounded">
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{mat.material_name}</span>
                              {mat.is_coating && (
                                <span className="bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded">Coating</span>
                              )}
                              {mat.is_composite && (
                                <span className="bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded">Composite</span>
                              )}
                            </div>
                            <div className="flex gap-3 text-gray-600">
                              <span className={mat.quantity ? '' : 'text-amber-600'}>
                                {mat.quantity ? `${mat.quantity} ${mat.unit}` : '⚠️ Unknown'}
                              </span>
                              <span>♻️ {mat.recycled_content}%</span>
                              <span>GWP: {mat.gwp_factor?.toFixed(2) || 'N/A'}</span>
                            </div>
                          </div>
                          {mat.quantity_note && (
                            <p className="text-xs text-gray-500 mt-1 italic">{mat.quantity_note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assumptions */}
                {nlpResult.parsed.assumptions.length > 0 && (
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <h4 className="font-medium text-yellow-800 mb-2">⚠️ Assumptions Made</h4>
                    <ul className="space-y-1 text-sm text-yellow-700">
                      {nlpResult.parsed.assumptions.map((assumption: NLPAssumption, idx: number) => (
                        <li key={idx}>
                          <strong>{assumption.field}:</strong> {assumption.value} - <em>{assumption.reason}</em>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Dataset Source Selection */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <label className="block text-sm font-medium text-blue-800 mb-2">
              📊 Data Source
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="dataset_source"
                  value="india_JNARDDC"
                  checked={formData.dataset_source === 'india_JNARDDC'}
                  onChange={(e) => setFormData({ ...formData, dataset_source: e.target.value as DatasetSource })}
                  className="mr-2 text-blue-600"
                />
                <div>
                  <span className="font-medium text-gray-700">🇮🇳 India (JNARDDC)</span>
                  <p className="text-xs text-gray-500">Indian National LCI Database</p>
                </div>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="dataset_source"
                  value="global"
                  checked={formData.dataset_source === 'global'}
                  onChange={(e) => setFormData({ ...formData, dataset_source: e.target.value as DatasetSource })}
                  className="mr-2 text-blue-600"
                />
                <div>
                  <span className="font-medium text-gray-700">🌍 Global (Ecoinvent)</span>
                  <p className="text-xs text-gray-500">International LCI Database</p>
                </div>
              </label>
            </div>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Aluminum Wheel Hub LCA"
              disabled={isLoading}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of the product and assessment goals..."
              disabled={isLoading}
            />
          </div>

          {/* Product Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Category
            </label>
            <select
              value={formData.product_category}
              onChange={(e) => setFormData({ ...formData, product_category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="">Select a category</option>
              <option value="ev_battery">EV Battery</option>
              <option value="power_transmission">Power Transmission</option>
              <option value="automotive">Automotive Components</option>
              <option value="electronics">Electronics</option>
              <option value="construction">Construction Materials</option>
              <option value="packaging">Packaging</option>
              <option value="appliances">Appliances</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Target Lifespan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Lifespan (years)
            </label>
            <input
              type="number"
              value={formData.target_lifespan}
              onChange={(e) => setFormData({ ...formData, target_lifespan: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 10"
              min="1"
              disabled={isLoading}
            />
            <p className="text-sm text-gray-500 mt-1">Expected product lifespan for circularity assessment</p>
          </div>

          {/* Designed for Disassembly */}
          <div className="flex items-start">
            <input
              type="checkbox"
              id="disassembly"
              checked={formData.is_designed_for_disassembly}
              onChange={(e) => setFormData({ ...formData, is_designed_for_disassembly: e.target.checked })}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isLoading}
            />
            <label htmlFor="disassembly" className="ml-3 block text-sm text-gray-700">
              <span className="font-medium">Designed for Disassembly</span>
              <p className="text-gray-500">Product is designed to be easily disassembled for recycling/repair</p>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-blue-300 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

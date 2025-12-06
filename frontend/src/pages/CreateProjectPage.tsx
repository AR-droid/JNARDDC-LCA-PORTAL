import { useState, FormEvent, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  projectsApi,
  parseNLPDescription,
  NLPParseResult,
  NLPAssumption,
  NLPParsedMaterial,
} from '../api/projects';
import { useAuthStore } from '../stores/authStore';
import { Mic, MicOff, Loader2, FileText, X, Sparkles, UploadCloud, Ban, BarChart3, Recycle, Nut, AlertTriangle, CheckCircle, ArrowLeft, Plus, ChevronDown, Settings, Pencil, Zap } from 'lucide-react';








const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Check project limit for free tier
  const projectCount = user?.project_count || 0;
  const projectLimit = user?.project_limit || 3;
  const canCreateProject = user?.tier !== 'free' || projectCount < projectLimit;

  // If user has reached limit, show upgrade prompt
  if (!canCreateProject) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <Ban className="w-12 h-12 text-red-600 mb-4" />

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Limit Reached</h2>
          <p className="text-gray-600 mb-4">
            You've used all {projectLimit} projects on your Free plan. Upgrade to Pro for unlimited projects and premium features.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Projects used</span>
              <span className="font-semibold text-red-600">{projectCount}/{projectLimit}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>
          <div className="space-y-3">
            <Link to="/pricing" className="block w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
              <Zap className="w-4 h-4 inline" /> Upgrade to Pro
            </Link>
            <Link to="/dashboard" className="block w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State
  const [projectName, setProjectName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [nlpResult, setNlpResult] = useState<NLPParseResult | null>(null);
  const [isParsingAI, setIsParsingAI] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Advanced Options State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [productCategory, setProductCategory] = useState('');
  const [targetLifespan, setTargetLifespan] = useState('');
  const [isDesignedForDisassembly, setIsDesignedForDisassembly] = useState(false);

  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Document Upload State
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<{ name: string; wordCount: number } | null>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

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
        stream.getTracks().forEach((track) => track.stop());
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
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.text) {
        setDescription((prev) => (prev ? prev + ' ' + data.text : data.text));
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

    // Check file type
    const allowedTypes = ['.pdf', '.docx', '.txt', '.csv', '.xlsx'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      setError('Unsupported file type. Please upload PDF, DOCX, TXT, CSV, or XLSX files.');
      return;
    }

    // Check file size (max 10MB)
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
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.extracted_text) {
        setDescription(data.extracted_text);
        setUploadedDocument({
          name: file.name,
          wordCount: data.word_count,
        });
      } else {
        setError(data.detail || 'Failed to parse document');
      }
    } catch (error) {
      console.error('Document upload error:', error);
      setError('Failed to upload document. Please try again.');
    } finally {
      setIsUploadingDocument(false);
      // Reset input
      if (documentInputRef.current) {
        documentInputRef.current.value = '';
      }
    }
  };

  const clearUploadedDocument = () => {
    setUploadedDocument(null);
    setDescription('');
  };

  // Ask AI to parse description
  const handleAskAI = async () => {
    if (!description.trim()) {
      setError('Please enter a description first');
      return;
    }

    setIsParsingAI(true);
    setError('');

    try {
      const result = await parseNLPDescription(description);
      setNlpResult(result);

      // Always update project name from AI suggestion (unless user manually set one)
      if (result.parsed.suggested_name) {
        // Only keep user's name if they've set something other than empty or the default
        const userHasCustomName = projectName && projectName !== 'Your New Project';
        if (!userHasCustomName) {
          setProjectName(result.parsed.suggested_name);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'AI analysis failed. You can still create the project.');
    } finally {
      setIsParsingAI(false);
    }
  };

  // Submit project
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    setIsLoading(true);
    try {
      const projectData: any = {
        name: projectName.trim(),
        description: description || undefined,
      };

      // Add AI-parsed data if available, or use manual advanced inputs
      if (nlpResult) {
        projectData.product_category = nlpResult.parsed.project.product_category || productCategory || undefined;
        projectData.target_lifespan = nlpResult.parsed.project.target_lifespan || (targetLifespan ? parseInt(targetLifespan) : undefined);
        projectData.is_designed_for_disassembly = nlpResult.parsed.project.is_designed_for_disassembly || isDesignedForDisassembly;
      } else if (showAdvanced) {
        // Use manual advanced inputs
        projectData.product_category = productCategory || undefined;
        projectData.target_lifespan = targetLifespan ? parseInt(targetLifespan) : undefined;
        projectData.is_designed_for_disassembly = isDesignedForDisassembly;
      }

      const project = await projectsApi.create(projectData);

      setSuccess('Project created successfully!');
      setTimeout(() => {
        navigate(`/projects/${project.id}`);
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {isEditingName ? (
              <div className="bg-white rounded-xl shadow-lg border-2 border-blue-500 px-4 py-2">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={projectName || 'Your New Project'}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      setIsEditingName(false);
                    }
                  }}
                  className="text-2xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0 min-w-0"
                  style={{ width: `${Math.max(12, (projectName || 'Your New Project').length + 1)}ch` }}
                  placeholder="Your New Project"
                  autoFocus
                />
              </div>
            ) : (
              <div 
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => {
                  setIsEditingName(true);
                  setTimeout(() => nameInputRef.current?.focus(), 0);
                }}
              >
                <h1 className="text-2xl font-bold text-gray-900">
                  {projectName || 'Your New Project'}
                </h1>
                <Pencil className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              const form = document.querySelector('form');
              if (form) form.requestSubmit();
            }}
            disabled={isLoading || !projectName.trim()}
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-blue-300 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Description with AI + File Upload Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Describe Your Product (2/3 width) */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Describe Your Product <span className="text-red-500">*</span></h3>
                  <p className="text-sm text-gray-500">Tell us about materials, quantities, and specifications</p>
                </div>
              </div>

              {/* Uploaded Document Badge */}
              {uploadedDocument && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700 flex-1">
                    {uploadedDocument.name} ({uploadedDocument.wordCount} words extracted)
                  </span>
                  <button type="button" onClick={clearUploadedDocument} className="text-blue-600 hover:text-blue-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Description Textarea with Mic */}
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 pr-14 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  placeholder={
                    isTranscribing
                      ? 'Transcribing your voice...'
                      : isUploadingDocument
                      ? 'Extracting text from document...'
                      : 'Example: 10kg copper wire with PVC coating, used in an electric motor. Contains 30% recycled content, designed for 10 year lifespan.'
                  }
                  disabled={isParsingAI || isTranscribing || isUploadingDocument}
                />
                {/* Mic Button */}
                <button
                  type="button"
                  onClick={handleVoiceButton}
                  disabled={isParsingAI || isTranscribing || isUploadingDocument}
                  className={`absolute right-3 top-3 p-2 rounded-lg transition ${
                    isRecording 
                      ? 'bg-red-500 text-white animate-pulse hover:bg-red-600' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isRecording ? 'Stop recording' : 'Voice input'}
                >
                  {isTranscribing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
              </div>

              {isRecording && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  Recording... Click mic to stop
                </p>
              )}

              {/* Ask AI Button */}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleAskAI}
                  disabled={isParsingAI || !description.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200"
                >
                  {isParsingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      AI Enhance
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: File Drop Zone (1/3 width) */}
            <div 
              className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-200 p-6 hover:border-blue-300 hover:bg-blue-50/50 transition cursor-pointer group flex flex-col items-center justify-center text-center"
              onClick={() => documentInputRef.current?.click()}
            >
              <input
                type="file"
                ref={documentInputRef}
                onChange={handleDocumentUpload}
                accept=".pdf,.docx,.txt,.csv,.xlsx"
                className="hidden"
              />
              <UploadCloud className="w-12 h-12 text-gray-300 group-hover:text-blue-400 mb-4 transition" />
              <p className="text-gray-600 group-hover:text-gray-800 font-medium transition">
                Upload Document
              </p>
              <p className="text-gray-500 group-hover:text-gray-700 text-sm mt-1 transition">
                Drop files here or <span className="text-blue-600 font-medium">browse</span>
              </p>
              <p className="text-xs text-gray-400 mt-3">
                PDF, DOCX, TXT, CSV, XLSX
              </p>
              {isUploadingDocument && (
                <div className="flex items-center gap-2 mt-3 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Parsing...</span>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-700">Advanced Options</span>
                <span className="text-xs text-gray-400">Category, Lifespan, Disassembly</span>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {/* Advanced Options Content */}
            {showAdvanced && (
              <div className="p-6 pt-2 border-t border-gray-100 space-y-4">
                {/* Product Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Category</label>
                  <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="">Select a category</option>
                    <option value="ev_battery">EV Battery</option>
                    <option value="power_transmission">Power Transmission</option>
                    <option value="automotive">Automotive Components</option>
                    <option value="electronics">Electronics</option>
                    <option value="construction">Construction Materials</option>
                    <option value="packaging">Packaging</option>
                    <option value="appliances">Appliances</option>
                    <option value="machinery">Machinery & Equipment</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Target Lifespan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Lifespan (years)</label>
                  <input
                    type="number"
                    value={targetLifespan}
                    onChange={(e) => setTargetLifespan(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="e.g., 10"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Expected product lifespan for MCI calculation</p>
                </div>

                {/* Designed for Disassembly */}
                <div className="flex items-start p-3 bg-gray-50 rounded-xl">
                  <input
                    type="checkbox"
                    id="disassembly"
                    checked={isDesignedForDisassembly}
                    onChange={(e) => setIsDesignedForDisassembly(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="disassembly" className="ml-3 block text-sm text-gray-700">
                    <span className="font-medium">Designed for Disassembly</span>
                    <p className="text-gray-500 text-xs">Product can be easily taken apart for recycling/repair</p>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* AI Analysis Results */}
          {nlpResult && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">AI Analysis</h3>
                {nlpResult.parsed.parsing_method === 'groq_llm' && (
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                    AI Powered
                  </span>
                )}
              </div>

              {/* Extracted Tokens */}
              {nlpResult.parsed.tokens.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2 text-sm">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    Extracted Information
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {nlpResult.parsed.tokens.map((token, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          token.type === 'material'
                            ? 'bg-blue-100 text-blue-700'
                            : token.type === 'quantity'
                            ? 'bg-purple-100 text-purple-700'
                            : token.type === 'lifespan'
                            ? 'bg-orange-100 text-orange-700'
                            : token.type === 'recycled_content'
                            ? 'bg-green-100 text-green-700'
                            : token.type === 'category'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {token.type}: {token.material || token.value || token.values?.join(', ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Detected Materials */}
              {nlpResult.parsed.materials.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2 text-sm">
                    <Nut className="w-4 h-4" />
                    Materials Detected ({nlpResult.parsed.materials.length})
                  </h4>
                  <div className="space-y-2">
                    {nlpResult.parsed.materials.map((mat: NLPParsedMaterial, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-800">{mat.material_name}</span>
                          <div className="flex gap-2 text-xs">
                            <span className="bg-gray-100 px-2 py-1 rounded">
                              {mat.quantity ? `${mat.quantity} ${mat.unit}` : 'Qty unknown'}
                            </span>
                            <span className="bg-green-100 px-2 py-1 rounded text-green-700 flex items-center gap-1">
                              <Recycle className="w-3 h-3" />
                              {mat.recycled_content}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assumptions */}
              {nlpResult.parsed.assumptions.length > 0 && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    AI Made Assumptions
                  </h4>
                  <ul className="space-y-1 text-sm text-amber-700">
                    {nlpResult.parsed.assumptions.map((assumption: NLPAssumption, idx: number) => (
                      <li key={idx} className="flex gap-2">
                        <span className="font-medium">{assumption.field}:</span>
                        <span>{assumption.value}</span>
                        <span className="text-amber-600 italic">({assumption.reason})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

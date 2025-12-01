import { useState, FormEvent, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi, parseNLPDescription, uploadDataset, NLPParseResult, NLPAssumption, NLPParsedMaterial, DatasetMaterial } from '../api/projects';

type InputMode = 'nlp' | 'manual';

interface UploadedDataset {
  id?: string;
  name: string;
  records: number;
  materials: DatasetMaterial[];
}

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Active mode (determines which side is "active" for submission)
  const [activeMode, setActiveMode] = useState<InputMode>('nlp');
  
  // NLP State
  const [nlpInput, setNlpInput] = useState('');
  const [nlpResult, setNlpResult] = useState<NLPParseResult | null>(null);
  const [isParsingNLP, setIsParsingNLP] = useState(false);
  
  // Manual State
  const [manualForm, setManualForm] = useState({
    name: '',
    description: '',
    product_category: '',
    target_lifespan: '',
    is_designed_for_disassembly: false,
  });
  
  // Dataset Upload State
  const [uploadedDataset, setUploadedDataset] = useState<UploadedDataset | null>(null);
  const [isUploadingDataset, setIsUploadingDataset] = useState(false);
  
  // Combined State
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Parse NLP description
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
      
      // Use suggested project name from NLP parser
      if (result.parsed.suggested_name) {
        setProjectName(result.parsed.suggested_name);
      } else if (result.parsed.materials.length > 0) {
        // Fallback to category + primary material
        const category = result.parsed.project?.product_category?.replace('_', ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || '';
        const primaryMaterial = result.parsed.materials[0]?.material_name || '';
        setProjectName(category ? `${category} - ${primaryMaterial}` : primaryMaterial);
      }
      
      setActiveMode('nlp');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to parse description');
    } finally {
      setIsParsingNLP(false);
    }
  };

  // Handle dataset file upload
  const handleDatasetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDataset(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        
        // Simple CSV parsing
        const lines = content.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const materials: DatasetMaterial[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const material: DatasetMaterial = {
            name: values[headers.indexOf('name')] || values[0] || `Material ${i}`,
            type: values[headers.indexOf('type')] || values[1] || 'unknown',
            emission_factor: parseFloat(values[headers.indexOf('emission_factor')] || values[2]) || 0,
            recycled_content: parseFloat(values[headers.indexOf('recycled_content')] || values[3]) || undefined,
            region: values[headers.indexOf('region')] || values[4] || undefined,
          };
          materials.push(material);
        }

        // Upload to backend
        try {
          const result = await uploadDataset(file.name, materials);
          setUploadedDataset({
            id: result.dataset_id,
            name: result.name,
            records: result.materials_count,
            materials
          });
          setSuccess(`Dataset uploaded: ${result.message}`);
        } catch (uploadErr: any) {
          // Store locally if backend upload fails
          setUploadedDataset({
            name: file.name,
            records: materials.length,
            materials
          });
          console.warn('Backend upload failed, using local dataset:', uploadErr);
        }
        
        setIsUploadingDataset(false);
      };
      reader.readAsText(file);
    } catch (err: any) {
      setError('Failed to parse dataset file');
      setIsUploadingDataset(false);
    }
  };

  // Submit project
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const name = projectName.trim() || manualForm.name.trim();
    if (!name) {
      setError('Project name is required');
      return;
    }

    setIsLoading(true);
    try {
      let projectData: any = { name };

      if (activeMode === 'nlp' && nlpResult) {
        // Use NLP parsed data
        projectData = {
          ...projectData,
          description: nlpInput,
          product_category: nlpResult.parsed.project.product_category || undefined,
          target_lifespan: nlpResult.parsed.project.target_lifespan || undefined,
          is_designed_for_disassembly: nlpResult.parsed.project.is_designed_for_disassembly,
        };
      } else {
        // Use manual form data
        projectData = {
          ...projectData,
          description: manualForm.description || undefined,
          product_category: manualForm.product_category || undefined,
          target_lifespan: manualForm.target_lifespan ? parseInt(manualForm.target_lifespan) : undefined,
          is_designed_for_disassembly: manualForm.is_designed_for_disassembly,
        };
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
          <p className="text-gray-600 mt-2">
            Start your Life Cycle Assessment using Smart Input (NLP) or Manual Entry
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Project Name - Top Section */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <label className="block text-lg font-semibold text-gray-800 mb-3">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={projectName || manualForm.name}
              onChange={(e) => {
                setProjectName(e.target.value);
                setManualForm({ ...manualForm, name: e.target.value });
              }}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., EV Battery Pack LCA, Copper Motor Windings Assessment"
              required
            />
          </div>

          {/* Side by Side Input Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* LEFT: NLP Smart Input */}
            <div 
              className={`bg-white rounded-xl shadow-md overflow-hidden transition-all ${
                activeMode === 'nlp' ? 'ring-2 ring-green-500' : ''
              }`}
            >
              <div 
                className={`p-4 cursor-pointer ${
                  activeMode === 'nlp' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-800'
                }`}
                onClick={() => setActiveMode('nlp')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <h2 className="text-xl font-bold">Smart Input (NLP)</h2>
                      <p className={`text-sm ${activeMode === 'nlp' ? 'text-green-100' : 'text-green-600'}`}>
                        Describe your product in natural language
                      </p>
                    </div>
                  </div>
                  {activeMode === 'nlp' && (
                    <span className="bg-white text-green-600 px-3 py-1 rounded-full text-sm font-medium">
                      Active
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Description
                  </label>
                  <textarea
                    value={nlpInput}
                    onChange={(e) => setNlpInput(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Example: 10kg copper wire, PVC coated, used in an electric motor for 10 years. Contains 30% recycled content."
                    disabled={isParsingNLP}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleNLPParse}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:bg-green-300 flex items-center justify-center gap-2"
                  disabled={isParsingNLP || !nlpInput.trim()}
                >
                  {isParsingNLP ? (
                    <>
                      <span className="animate-spin">⏳</span> Parsing...
                    </>
                  ) : (
                    <>
                      ✨ Parse Description
                    </>
                  )}
                </button>

                {/* NLP Result Display */}
                {nlpResult && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    {/* Parsed Tokens */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">📊 Extracted Data</h4>
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
                              token.type === 'coating' ? 'bg-yellow-100 text-yellow-700' :
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
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-blue-800">🔩 Materials Detected</h4>
                          {nlpResult.parsed.parsing_method && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              nlpResult.parsed.parsing_method === 'groq_llm' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {nlpResult.parsed.parsing_method === 'groq_llm' ? '🤖 AI Parsed' : '📝 Regex Parsed'}
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {nlpResult.parsed.materials.map((mat: NLPParsedMaterial, idx: number) => (
                            <div key={idx} className="bg-white p-3 rounded-lg shadow-sm">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-800">{mat.material_name}</span>
                                  {mat.is_coating && (
                                    <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">Coating</span>
                                  )}
                                  {mat.is_composite && (
                                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">Composite</span>
                                  )}
                                </div>
                                <div className="flex gap-2 text-xs">
                                  <span className={`px-2 py-1 rounded ${mat.quantity ? 'bg-gray-100' : 'bg-amber-100 text-amber-700'}`}>
                                    {mat.quantity ? `${mat.quantity} ${mat.unit}` : '⚠️ Unknown'}
                                  </span>
                                  <span className="bg-green-100 px-2 py-1 rounded text-green-700">♻️ {mat.recycled_content}%</span>
                                  <span className="bg-orange-100 px-2 py-1 rounded text-orange-700">GWP: {mat.gwp_factor?.toFixed(2) || 'N/A'}</span>
                                </div>
                              </div>
                              {mat.quantity_note && (
                                <p className="text-xs text-gray-500 mt-1 italic">📝 {mat.quantity_note}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assumptions */}
                    {nlpResult.parsed.assumptions.length > 0 && (
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h4 className="font-medium text-yellow-800 mb-2">⚠️ AI Assumptions (Gap Filling)</h4>
                        <ul className="space-y-1 text-sm text-yellow-700">
                          {nlpResult.parsed.assumptions.map((assumption: NLPAssumption, idx: number) => (
                            <li key={idx} className="flex gap-2">
                              <span className="font-medium">{assumption.field}:</span>
                              <span>{assumption.value}</span>
                              <span className="text-yellow-600 italic">({assumption.reason})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Project Settings from NLP */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">⚙️ Project Settings</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white p-2 rounded">
                          <span className="text-gray-500">Category:</span>
                          <span className="ml-2 font-medium">{nlpResult.parsed.project.product_category || 'Not detected'}</span>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <span className="text-gray-500">Lifespan:</span>
                          <span className="ml-2 font-medium">{nlpResult.parsed.project.target_lifespan || 'N/A'} years</span>
                        </div>
                        <div className="bg-white p-2 rounded col-span-2">
                          <span className="text-gray-500">Designed for Disassembly:</span>
                          <span className="ml-2 font-medium">{nlpResult.parsed.project.is_designed_for_disassembly ? 'Yes ✅' : 'No'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Manual Input */}
            <div 
              className={`bg-white rounded-xl shadow-md overflow-hidden transition-all ${
                activeMode === 'manual' ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div 
                className={`p-4 cursor-pointer ${
                  activeMode === 'manual' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800'
                }`}
                onClick={() => setActiveMode('manual')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <h2 className="text-xl font-bold">Manual Entry</h2>
                      <p className={`text-sm ${activeMode === 'manual' ? 'text-blue-100' : 'text-blue-600'}`}>
                        Fill in project details step by step
                      </p>
                    </div>
                  </div>
                  {activeMode === 'manual' && (
                    <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                      Active
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Description
                  </label>
                  <textarea
                    value={manualForm.description}
                    onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of the product and assessment goals..."
                  />
                </div>

                {/* Product Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Category
                  </label>
                  <select
                    value={manualForm.product_category}
                    onChange={(e) => setManualForm({ ...manualForm, product_category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    <option value="ev_battery">🔋 EV Battery</option>
                    <option value="power_transmission">⚡ Power Transmission</option>
                    <option value="automotive">🚗 Automotive Components</option>
                    <option value="electronics">💻 Electronics</option>
                    <option value="construction">🏗️ Construction Materials</option>
                    <option value="packaging">📦 Packaging</option>
                    <option value="appliances">🏠 Appliances</option>
                    <option value="machinery">⚙️ Machinery & Equipment</option>
                    <option value="other">📋 Other</option>
                  </select>
                </div>

                {/* Target Lifespan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Lifespan (years)
                  </label>
                  <input
                    type="number"
                    value={manualForm.target_lifespan}
                    onChange={(e) => setManualForm({ ...manualForm, target_lifespan: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 10"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Expected product lifespan for MCI calculation</p>
                </div>

                {/* Designed for Disassembly */}
                <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="disassembly"
                    checked={manualForm.is_designed_for_disassembly}
                    onChange={(e) => setManualForm({ ...manualForm, is_designed_for_disassembly: e.target.checked })}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="disassembly" className="ml-3 block text-sm text-gray-700">
                    <span className="font-medium">Designed for Disassembly</span>
                    <p className="text-gray-500 text-xs">Product can be easily taken apart for recycling/repair</p>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Dataset Upload Section */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📊</span>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Custom Dataset (Optional)</h2>
                <p className="text-sm text-gray-600">
                  Upload your own material/product dataset to inform design decisions
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Area */}
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleDatasetUpload}
                  className="hidden"
                />
                <div className="space-y-2">
                  <span className="text-4xl">📁</span>
                  <p className="text-gray-600 font-medium">
                    {isUploadingDataset ? 'Processing...' : 'Click to upload or drag & drop'}
                  </p>
                  <p className="text-xs text-gray-400">CSV or Excel file with materials data</p>
                </div>
              </div>

              {/* Dataset Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-3">Expected Format:</h4>
                <div className="text-xs bg-white p-3 rounded border font-mono overflow-x-auto">
                  <div className="text-gray-500">name,type,emission_factor,recycled_content,region</div>
                  <div className="text-gray-700">Copper Wire,copper_primary,3.5,35,India</div>
                  <div className="text-gray-700">Aluminium Sheet,aluminium_secondary,0.6,100,India</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Your data enhances the AI's recommendations for your specific context
                </p>
              </div>
            </div>

            {/* Uploaded Dataset Preview */}
            {uploadedDataset && (
              <div className="mt-4 bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="font-medium text-green-800">{uploadedDataset.name}</span>
                    <span className="text-sm text-green-600">({uploadedDataset.records} records)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedDataset(null)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {uploadedDataset.materials.slice(0, 4).map((mat, idx) => (
                    <div key={idx} className="bg-white p-2 rounded text-xs">
                      <div className="font-medium text-gray-800">{mat.name}</div>
                      <div className="text-gray-500">EF: {mat.emission_factor} | {mat.region || 'Global'}</div>
                    </div>
                  ))}
                  {uploadedDataset.materials.length > 4 && (
                    <div className="bg-white p-2 rounded text-xs flex items-center justify-center text-gray-500">
                      +{uploadedDataset.materials.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Submit Section */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Mode:</span>{' '}
                <span className={activeMode === 'nlp' ? 'text-green-600' : 'text-blue-600'}>
                  {activeMode === 'nlp' ? '🤖 Smart Input (NLP)' : '📝 Manual Entry'}
                </span>
                {uploadedDataset && (
                  <span className="ml-3 text-purple-600">📊 Custom Dataset Loaded</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/projects')}
                  className="px-6 py-3 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin">⏳</span> Creating...
                    </>
                  ) : (
                    <>
                      🚀 Create Project
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

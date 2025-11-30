import { useState, FormEvent } from 'react';
import { projectsApi, parseNLPDescription, NLPParseResult, NLPAssumption } from '../api/projects';

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type InputMode = 'manual' | 'nlp';
type DatasetSource = 'global' | 'india_jnarrdc';

export default function ProjectCreateModal({ isOpen, onClose, onSuccess }: ProjectCreateModalProps) {
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [nlpInput, setNlpInput] = useState('');
  const [nlpResult, setNlpResult] = useState<NLPParseResult | null>(null);
  const [isParsingNLP, setIsParsingNLP] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    product_category: '',
    target_lifespan: '',
    is_designed_for_disassembly: false,
    dataset_source: 'india_jnarrdc' as DatasetSource,
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
      
      // Generate project name from materials
      if (result.parsed.materials.length > 0) {
        const matNames = result.parsed.materials.map(m => m.material_name).join(', ');
        setFormData(prev => ({
          ...prev,
          name: prev.name || `LCA - ${matNames}`,
          description: nlpInput,
        }));
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to parse description');
    } finally {
      setIsParsingNLP(false);
    }
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
      dataset_source: 'india_jnarrdc',
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
              🤖 Smart Input (NLP)
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
            <h3 className="text-lg font-semibold text-green-800 mb-2">🤖 Smart Input</h3>
            <p className="text-sm text-green-700 mb-3">
              Describe your product in natural language. Our AI will extract materials, quantities, and lifecycle details.
            </p>
            
            <div className="space-y-3">
              <textarea
                value={nlpInput}
                onChange={(e) => setNlpInput(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Example: 10kg copper wire, PVC coated, used in a motor for 10 years"
                disabled={isParsingNLP}
              />
              
              <button
                type="button"
                onClick={handleNLPParse}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:bg-green-300"
                disabled={isParsingNLP || !nlpInput.trim()}
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
                    <h4 className="font-medium text-gray-700 mb-2">🔩 Detected Materials</h4>
                    <div className="space-y-2">
                      {nlpResult.parsed.materials.map((mat, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                          <span className="font-medium">{mat.material_name}</span>
                          <div className="flex gap-4 text-gray-600">
                            <span>{mat.quantity} {mat.unit}</span>
                            <span>♻️ {mat.recycled_content}%</span>
                            <span>GWP: {mat.gwp_factor.toFixed(2)}</span>
                          </div>
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
                  value="india_jnarrdc"
                  checked={formData.dataset_source === 'india_jnarrdc'}
                  onChange={(e) => setFormData({ ...formData, dataset_source: e.target.value as DatasetSource })}
                  className="mr-2 text-blue-600"
                />
                <div>
                  <span className="font-medium text-gray-700">🇮🇳 India (JNARRDC)</span>
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

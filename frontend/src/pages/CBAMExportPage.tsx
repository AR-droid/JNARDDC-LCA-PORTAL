import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getCBAMReport, getCBAMReportQr, downloadCBAMCSV, downloadCBAMExcel, downloadBRSRExcel, CBAMReport, projectsApi } from '../api/projects'
import { useAuthStore } from '../stores/authStore'
import { UpgradePrompt } from '../components/FeatureGate'
import { FileSpreadsheet, Download, FileText, Loader2, QrCode, Lock, Sparkles, AlertTriangle } from 'lucide-react'
import { ChartIcon, AnalyticsIcon, AIIcon, FlaskIcon } from '../components/Icons'

export default function CBAMExportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [report, setReport] = useState<CBAMReport | null>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadingType, setDownloadingType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrData, setQrData] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [isQrLoading, setIsQrLoading] = useState(false)
  
  const hasCBAMAccess = user?.subscription_tier === 'pro' || user?.subscription_tier === 'enterprise'

  useEffect(() => {
    if (id) {
      loadReport()
    }
  }, [id])

  const loadReport = async () => {
    if (!id) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const [reportData, project] = await Promise.all([
        getCBAMReport(id),
        projectsApi.getById(id)
      ])
      
      setReport(reportData)
      setProjectName(project.name)
    } catch (err: any) {
      console.error('Error loading CBAM report:', err)
      setError(err.response?.data?.detail || 'Failed to generate CBAM report')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadCSV = async () => {
    if (!id) return
    
    try {
      setIsDownloading(true)
      setDownloadingType('csv')
      await downloadCBAMCSV(id)
    } catch (err) {
      console.error('Error downloading CSV:', err)
      alert('Failed to download CSV')
    } finally {
      setIsDownloading(false)
      setDownloadingType(null)
    }
  }

  const handleDownloadExcel = async () => {
    if (!id) return
    
    try {
      setIsDownloading(true)
      setDownloadingType('excel')
      await downloadCBAMExcel(id)
    } catch (err) {
      console.error('Error downloading Excel:', err)
      alert('Failed to download Excel report')
    } finally {
      setIsDownloading(false)
      setDownloadingType(null)
    }
  }

  const handleDownloadBRSR = async () => {
    if (!id) return
    
    try {
      setIsDownloading(true)
      setDownloadingType('brsr')
      await downloadBRSRExcel(id)
    } catch (err) {
      console.error('Error downloading BRSR:', err)
      alert('Failed to download BRSR report')
    } finally {
      setIsDownloading(false)
      setDownloadingType(null)
    }
  }

  const handleDownloadJSON = () => {
    if (!report) return
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `cbam_report_${id?.slice(0, 8)}.json`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const handleShowQr = async () => {
    if (!id) return
    try {
      setIsQrLoading(true)
      const data = await getCBAMReportQr(id)
      setQrData(data.qr_code)
      setQrUrl(data.url)
      setQrModalOpen(true)
    } catch (err) {
      console.error('Error generating QR code:', err)
      alert('Failed to generate QR code')
    } finally {
      setIsQrLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating CBAM report...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="w-16 h-16 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Generating Report</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link to={`/projects/${id}`} className="text-blue-600 hover:text-blue-700">
            ← Back to Project
          </Link>
        </div>
      </div>
    )
  }

  if (!report) return null

  // Check feature access (user is already available from useAuthStore hook at the top)
  if (!hasCBAMAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <UpgradePrompt feature="cbam_export" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Secondary Navigation Bar */}
        <div className="bg-white rounded-lg shadow mb-5">
          <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100">
            <button
              onClick={() => navigate('/projects')}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1.5"
            >
              <span className="text-base">←</span> Back
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <button
              onClick={() => navigate(`/projects/${id}`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/analytics`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors flex items-center gap-2"
            >
              <ChartIcon size={16} /> Analytics
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/lcia`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-md transition-colors flex items-center gap-2"
            >
              <AnalyticsIcon size={16} /> LCIA
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/analysis`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors flex items-center gap-2"
            >
              <AnalyticsIcon size={16} /> Analysis
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/recommendations`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-md transition-colors flex items-center gap-2"
            >
              <AIIcon size={16} /> Design Advisor
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/scenario`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors flex items-center gap-2"
            >
              <FlaskIcon size={16} /> Scenarios
            </button>
            <button
              className="px-4 py-2 text-sm font-medium bg-amber-50 text-amber-700 rounded-md transition-colors flex items-center gap-2"
            >
              <FileSpreadsheet size={16} /> CBAM
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Compliance Export Reports</h1>
              <p className="text-gray-600 mt-1">CBAM (EU) & BRSR (SEBI) Compliance Reports</p>
            </div>
            <div className="flex gap-3 items-center">
              <button
                onClick={handleDownloadExcel}
                disabled={isDownloading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {downloadingType === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} CBAM Excel
              </button>
              <button
                onClick={handleDownloadBRSR}
                disabled={isDownloading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {downloadingType === 'brsr' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} BRSR Excel
              </button>
              <button
                onClick={handleDownloadCSV}
                disabled={isDownloading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
              >
                {downloadingType === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} CSV
              </button>
              <button
                onClick={handleDownloadJSON}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" /> JSON
              </button>
              <button
                onClick={handleShowQr}
                disabled={isQrLoading}
                className="px-4 py-2 bg-white text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
              >
                {isQrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                QR code
              </button>
            </div>
          </div>
        </div>

        {/* BRSR Banner */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇮🇳</span>
            <div>
              <h3 className="font-semibold text-green-900">SEBI BRSR Report Available</h3>
              <p className="text-sm text-green-700">
                Download BRSR Principle 6 (Environment) report for SEBI compliance. 
                Includes GHG emissions, circularity metrics, and waste management data.
              </p>
            </div>
          </div>
        </div>

        {/* Report Metadata */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              🇪🇺
            </div>
            <div>
              <h2 className="text-lg font-semibold">{report.report_metadata.report_type}</h2>
              <p className="text-sm text-gray-500">{report.report_metadata.regulation_reference}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Report ID</p>
              <p className="font-mono font-medium">{report.report_metadata.report_id}</p>
            </div>
            <div>
              <p className="text-gray-500">Reporting Period</p>
              <p className="font-medium">{report.report_metadata.reporting_period}</p>
            </div>
            <div>
              <p className="text-gray-500">Generated</p>
              <p className="font-medium">{new Date(report.report_metadata.generation_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Software</p>
              <p className="font-medium">{report.report_metadata.software_version}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Quantity</p>
            <p className="text-2xl font-bold text-blue-600">{report.summary.total_quantity_tonnes.toFixed(3)}</p>
            <p className="text-xs text-gray-400">tonnes</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Embedded Emissions</p>
            <p className="text-2xl font-bold text-green-600">{report.summary.total_embedded_emissions_tco2.toFixed(4)}</p>
            <p className="text-xs text-gray-400">tCO₂</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Specific Emissions</p>
            <p className="text-2xl font-bold text-purple-600">{report.summary.average_specific_emissions.toFixed(4)}</p>
            <p className="text-xs text-gray-400">tCO₂/t product</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Est. CBAM Liability</p>
            <p className="text-2xl font-bold text-orange-600">€{report.summary.estimated_cbam_liability_eur.toFixed(2)}</p>
            <p className="text-xs text-gray-400">@ €{report.summary.estimated_ets_price_eur}/tCO₂</p>
          </div>
        </div>

        {/* Declarant Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Declarant Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Company</span>
                <span className="font-medium">{report.declarant_information.company_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Contact</span>
                <span className="font-medium">{report.declarant_information.contact_person}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{report.declarant_information.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Country of Origin</span>
                <span className="font-medium">{report.declarant_information.country_of_origin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">EORI Number</span>
                <span className="font-medium text-orange-600">{report.declarant_information.eori_number}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Verification Requirements</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Accredited Verifier Required</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  report.verification_requirements.accredited_verifier_required 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {report.verification_requirements.accredited_verifier_required ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Verification Deadline</span>
                <span className="font-medium">{report.verification_requirements.verification_deadline}</span>
              </div>
              <div className="mt-4">
                <p className="text-gray-500 mb-2">Required Documentation:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {report.verification_requirements.documentation_required.map((doc, i) => (
                    <li key={i} className="text-xs">{doc}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Goods Declaration Table */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">CBAM Goods Declaration</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4">CN Code</th>
                  <th className="text-left py-3 px-4">Product</th>
                  <th className="text-left py-3 px-4">CBAM Category</th>
                  <th className="text-right py-3 px-4">Quantity (t)</th>
                  <th className="text-right py-3 px-4">Embedded (tCO₂)</th>
                  <th className="text-right py-3 px-4">Specific (tCO₂/t)</th>
                  <th className="text-right py-3 px-4">Recycled %</th>
                  <th className="text-center py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.goods_declaration.map((good, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-blue-600">{good.cn_code}</td>
                    <td className="py-3 px-4">{good.product_description}</td>
                    <td className="py-3 px-4 text-gray-600">{good.cbam_category}</td>
                    <td className="py-3 px-4 text-right">{good.quantity_tonnes.toFixed(4)}</td>
                    <td className="py-3 px-4 text-right">{good.embedded_emissions_tco2.toFixed(4)}</td>
                    <td className="py-3 px-4 text-right">{good.specific_embedded_emissions.toFixed(4)}</td>
                    <td className="py-3 px-4 text-right">{good.recycled_content_percent}%</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                        {good.verification_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compliance Notes */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Compliance Notes
          </h3>
          <ul className="space-y-2">
            {report.compliance_notes.map((note, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <span className="text-amber-500">•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Link
            to={`/projects/${id}`}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            ← Back to Project
          </Link>
          <Link
            to={`/projects/${id}/analytics`}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            View Analytics →
          </Link>
        </div>
        {/* QR Modal */}
        {qrModalOpen && qrData && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">CBAM report QR code</h3>
                <button
                  onClick={() => setQrModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-col items-center gap-3">
                <img
                  src={`data:image/png;base64,${qrData}`}
                  alt="CBAM report QR code"
                  className="w-48 h-48 border border-gray-200 rounded-lg"
                />
                {qrUrl && (
                  <p className="text-xs text-gray-500 break-all text-center">
                    {qrUrl}
                  </p>
                )}
                <p className="text-xs text-gray-500 text-center mt-1">
                  Scan this QR to open the CBAM report export page.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

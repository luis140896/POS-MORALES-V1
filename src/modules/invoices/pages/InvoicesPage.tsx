import { useState, useEffect } from 'react'
import { Search, Eye, Filter, X, Loader2, Ban, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/shared/components/ui/Button'
import { invoiceService } from '@/core/api/invoiceService'
import { Invoice } from '@/types'

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'voided'>('active')

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const res = await invoiceService.getAll()
      setInvoices((res as any).content || res)
    } catch (error) {
      console.error('Error loading invoices:', error)
      toast.error('Error al cargar facturas')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'EFECTIVO': return 'Efectivo'
      case 'TRANSFERENCIA': return 'Transferencia'
      case 'TARJETA_CREDITO': return 'Tarjeta Crédito'
      case 'TARJETA_DEBITO': return 'Tarjeta Débito'
      default: return method
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETADA': return <span className="badge badge-success">Completada</span>
      case 'ANULADA': return <span className="badge badge-danger">Anulada</span>
      case 'PENDIENTE': return <span className="badge badge-warning">Pendiente</span>
      default: return <span className="badge badge-info">{status}</span>
    }
  }

  const openDetail = async (invoice: Invoice) => {
    try {
      const detail = await invoiceService.getById(invoice.id)
      setSelectedInvoice(detail as Invoice)
      setShowDetailModal(true)
    } catch (error) {
      toast.error('Error al cargar detalle')
    }
  }

  const openVoidModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setVoidReason('')
    setShowVoidModal(true)
  }

  const handleVoid = async () => {
    if (!selectedInvoice || !voidReason.trim()) return
    
    setProcessing(true)
    try {
      await invoiceService.voidInvoice(selectedInvoice.id, { reason: voidReason })
      toast.success('Factura anulada')
      setShowVoidModal(false)
      fetchInvoices()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al anular factura')
    } finally {
      setProcessing(false)
    }
  }

  // Separar facturas activas y anuladas
  const activeInvoices = invoices.filter(inv => inv.status !== 'ANULADA')
  const voidedInvoices = invoices.filter(inv => inv.status === 'ANULADA')
  
  // Filtrar según tab activo y término de búsqueda
  const currentInvoices = activeTab === 'active' ? activeInvoices : voidedInvoices
  const filteredInvoices = currentInvoices.filter(inv => 
    inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customer?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Facturas</h1>
          <p className="text-gray-500">Historial de ventas y transacciones</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'active'
              ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-soft'
              : 'bg-white text-gray-600 hover:bg-primary-50'
          }`}
        >
          Activas
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'active' ? 'bg-white/20' : 'bg-primary-100 text-primary-600'
          }`}>
            {activeInvoices.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('voided')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'voided'
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-soft'
              : 'bg-white text-gray-600 hover:bg-red-50'
          }`}
        >
          Anuladas
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            activeTab === 'voided' ? 'bg-white/20' : 'bg-red-100 text-red-600'
          }`}>
            {voidedInvoices.length}
          </span>
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por número o cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-12" 
            />
          </div>
          <Button variant="secondary"><Filter size={20} /> Filtros</Button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            No se encontraron facturas
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-primary-50">
                <th className="table-header">N° Factura</th>
                <th className="table-header">Cliente</th>
                <th className="table-header">Fecha</th>
                <th className="table-header text-right">Total</th>
                <th className="table-header text-center">Estado</th>
                <th className="table-header text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-primary-50/50 transition-colors">
                  <td className="table-cell font-mono">{invoice.invoiceNumber}</td>
                  <td className="table-cell">
                    <div>
                      <p className="font-medium">{invoice.customer?.fullName || invoice.customerName || 'Cliente General'}</p>
                      {(invoice.customer?.documentNumber || invoice.customerDocument) && (
                        <p className="text-xs text-gray-500">
                          {invoice.customer?.documentType || 'Doc'} {invoice.customer?.documentNumber || invoice.customerDocument}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">{formatDate(invoice.createdAt)}</td>
                  <td className="table-cell text-right font-semibold text-primary-600">{formatCurrency(invoice.total)}</td>
                  <td className="table-cell text-center">{getStatusBadge(invoice.status)}</td>
                  <td className="table-cell">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => openDetail(invoice)}
                        className="p-2 rounded-lg hover:bg-primary-100 text-gray-500"
                        title="Ver detalle"
                      >
                        <Eye size={18} />
                      </button>
                      {invoice.status !== 'ANULADA' && (
                        <button 
                          onClick={() => openVoidModal(invoice)}
                          className="p-2 rounded-lg hover:bg-red-100 text-red-500"
                          title="Anular"
                        >
                          <Ban size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Factura {selectedInvoice.invoiceNumber}</h3>
                <p className="text-gray-500">{formatDate(selectedInvoice.createdAt)}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Información del Cliente */}
              <div className="bg-primary-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-600 mb-2">Información del Cliente</h4>
                <p className="font-medium text-gray-800">{selectedInvoice.customer?.fullName || selectedInvoice.customerName || 'Cliente General'}</p>
                {selectedInvoice.customer && (
                  <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                    {selectedInvoice.customer.documentNumber && (
                      <p>{selectedInvoice.customer.documentType}: {selectedInvoice.customer.documentNumber}</p>
                    )}
                    {selectedInvoice.customer.phone && <p>Tel: {selectedInvoice.customer.phone}</p>}
                    {selectedInvoice.customer.email && <p>Email: {selectedInvoice.customer.email}</p>}
                  </div>
                )}
                {!selectedInvoice.customer && selectedInvoice.customerDocument && (
                  <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                    <p>Documento: {selectedInvoice.customerDocument}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Método de Pago:</span>
                <span>{getPaymentMethodLabel(selectedInvoice.paymentMethod || '')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estado:</span>
                {getStatusBadge(selectedInvoice.status)}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Detalle de Productos</h4>
                <div className="space-y-2">
                  {selectedInvoice.details?.map((detail, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{detail.quantity} x {detail.productName}</span>
                      <span>{formatCurrency(detail.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(selectedInvoice.discountAmount)}</span>
                  </div>
                )}
                {(selectedInvoice as any).serviceChargeAmount > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Servicio ({(selectedInvoice as any).serviceChargePercent}%):</span>
                    <span>{formatCurrency((selectedInvoice as any).serviceChargeAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-primary-600">{formatCurrency(selectedInvoice.total)}</span>
                </div>
                {selectedInvoice.amountReceived > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Recibido:</span>
                    <span>{formatCurrency(selectedInvoice.amountReceived)}</span>
                  </div>
                )}
                {(selectedInvoice as any).changeAmount > 0 && (
                  <div className="flex justify-between text-sm font-medium text-green-600">
                    <span>Cambio:</span>
                    <span>{formatCurrency((selectedInvoice as any).changeAmount)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button 
                variant="primary" 
                className="flex-1"
                onClick={() => {
                  const _settings = JSON.parse(localStorage.getItem('pos_settings') || '{}')
                  const companyName = _settings?.company?.companyName || 'Mi Empresa'
                  const inv = selectedInvoice as any
                  const printWindow = window.open('', '_blank')
                  if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Factura ${inv.invoiceNumber}</title>
                            <style>
                              body { font-family: 'Courier New', monospace; padding: 10px; max-width: 300px; margin: 0 auto; font-size: 12px; }
                              .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
                              .header h1 { margin: 0 0 2px; font-size: 16px; text-transform: uppercase; }
                              .header .invoice-num { font-size: 13px; font-weight: bold; }
                              .header p { margin: 2px 0; font-size: 11px; }
                              .info { margin-bottom: 8px; }
                              .info div { margin: 2px 0; }
                              .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; margin: 6px 0; }
                              .item { display: flex; justify-content: space-between; margin: 3px 0; }
                              .totals div { display: flex; justify-content: space-between; margin: 2px 0; }
                              .total-final { font-size: 15px; font-weight: bold; border-top: 2px solid #000; padding-top: 6px; margin-top: 6px; }
                              .payment-info { border-top: 1px dashed #000; margin-top: 8px; padding-top: 6px; }
                              .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #666; border-top: 1px dashed #000; padding-top: 8px; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>${companyName}</h1>
                              <div class="invoice-num">N° ${inv.invoiceNumber}</div>
                              <p>${formatDate(inv.createdAt)}</p>
                            </div>
                            <div class="info">
                              <div>Cliente: ${inv.customer?.fullName || inv.customerName || 'Cliente General'}</div>
                              <div>Cajero: ${inv.userName || '-'}</div>
                            </div>
                            <div class="items">
                              ${(inv.details || []).map((d: any) => `<div class="item"><span>${d.quantity} x ${d.productName}</span><span>${formatCurrency(d.subtotal)}</span></div>`).join('')}
                            </div>
                            <div class="totals">
                              <div><span>Subtotal:</span><span>${formatCurrency(inv.subtotal)}</span></div>
                              ${inv.discountAmount > 0 ? `<div><span>Descuento:</span><span>-${formatCurrency(inv.discountAmount)}</span></div>` : ''}
                              ${inv.serviceChargeAmount > 0 ? `<div><span>Servicio (${inv.serviceChargePercent}%):</span><span>${formatCurrency(inv.serviceChargeAmount)}</span></div>` : ''}
                              <div class="total-final"><span>TOTAL:</span><span>${formatCurrency(inv.total)}</span></div>
                            </div>
                            <div class="payment-info">
                              <div><span>Método:</span><span>${getPaymentMethodLabel(inv.paymentMethod)}</span></div>
                              ${inv.amountReceived > 0 ? `<div><span>Recibido:</span><span>${formatCurrency(inv.amountReceived)}</span></div>` : ''}
                              ${inv.changeAmount > 0 ? `<div style="font-weight:bold;"><span>Cambio:</span><span>${formatCurrency(inv.changeAmount)}</span></div>` : ''}
                            </div>
                            <div class="footer">
                              <p>¡Gracias por su compra!</p>
                            </div>
                          </body>
                        </html>
                      `)
                      printWindow.document.close()
                    printWindow.print()
                  }
                }}
              >
                <Printer size={20} />
                Imprimir
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setShowDetailModal(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {showVoidModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Anular Factura</h3>
              <button onClick={() => setShowVoidModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <p className="text-gray-500 mb-4">
              ¿Está seguro de anular la factura <strong>{selectedInvoice.invoiceNumber}</strong>?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Razón de anulación *</label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="input-field min-h-[100px]"
                placeholder="Ingrese la razón..."
                required
              />
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowVoidModal(false)}>
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                className="flex-1 bg-red-600 hover:bg-red-700" 
                onClick={handleVoid}
                disabled={!voidReason.trim() || processing}
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Anular'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvoicesPage

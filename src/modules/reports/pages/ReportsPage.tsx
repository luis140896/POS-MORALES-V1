import { useState, useEffect } from 'react'
import { Calendar, Download, BarChart3, TrendingUp, DollarSign, Loader2, Package, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/shared/components/ui/Button'
import { reportService, SalesSummary, TopProduct, TopCustomer, InventorySummary, PaymentMethodStat } from '@/core/api/reportService'
import { invoiceService } from '@/core/api/invoiceService'
import * as XLSX from 'xlsx'

const ReportsPage = () => {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodStat[]>([])

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const startDateTime = `${dateRange.start}T00:00:00`
      const endDateTime = `${dateRange.end}T23:59:59`

      const [summary, products, customers, inventory, payments] = await Promise.all([
        reportService.getSalesSummary(startDateTime, endDateTime).catch(() => null),
        reportService.getTopProducts(startDateTime, endDateTime, 5).catch(() => []),
        reportService.getTopCustomers(startDateTime, endDateTime, 5).catch(() => []),
        reportService.getInventorySummary().catch(() => null),
        reportService.getSalesByPaymentMethod(startDateTime, endDateTime).catch(() => [])
      ])

      setSalesSummary(summary as SalesSummary | null)
      setTopProducts(products as TopProduct[])
      setTopCustomers(customers as TopCustomer[])
      setInventorySummary(inventory as InventorySummary | null)
      setPaymentMethods(payments as PaymentMethodStat[])
    } catch (error) {
      console.error('Error loading reports:', error)
      toast.error('Error al cargar reportes')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0)

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'EFECTIVO':
        return 'Efectivo'
      case 'TARJETA_CREDITO':
        return 'Tarjeta Crédito'
      case 'TARJETA_DEBITO':
        return 'Tarjeta Débito'
      case 'TRANSFERENCIA':
        return 'Transferencia'
      case 'NEQUI':
        return 'Nequi'
      case 'DAVIPLATA':
        return 'Daviplata'
      case 'MIXTO':
        return 'Mixto'
      default:
        return method
    }
  }

  const setQuickDate = (type: 'today' | 'week' | 'month' | 'year') => {
    const today = new Date()
    let start = new Date()

    switch (type) {
      case 'today':
        start = today
        break
      case 'week':
        start = new Date(today.setDate(today.getDate() - 7))
        break
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case 'year':
        start = new Date(today.getFullYear(), 0, 1)
        break
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    })
  }

  useEffect(() => {
    fetchReports()
  }, [dateRange])

  const exportToExcel = async () => {
    if (!salesSummary) {
      toast.error('No hay datos para exportar')
      return
    }

    const startDateTime = `${dateRange.start}T00:00:00`
    const endDateTime = `${dateRange.end}T23:59:59`

    const safeNumber = (v: any) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : 0
    }

    const isCash = (method?: string | null) => (method || '') === 'EFECTIVO'
    const isCard = (method?: string | null) => ['TARJETA_CREDITO', 'TARJETA_DEBITO'].includes(method || '')

    const getPaymentMethodLabelLocal = (method?: string | null) => {
      const m = method || ''
      if (!m) return 'N/A'
      return getPaymentMethodLabel(m)
    }

    const loadingToast = toast.loading('Generando Excel...')
    try {
      const invoices = (await invoiceService.getByDateRange(startDateTime, endDateTime).catch(() => [])) as any[]

      const invoicesCompleted = invoices.filter((i) => (i as any).status === 'COMPLETADA')

      const totals = invoicesCompleted.reduce(
        (acc, inv) => {
          const method = (inv as any).paymentMethod
          const total = safeNumber((inv as any).total)
          const subtotal = safeNumber((inv as any).subtotal)
          const tax = safeNumber((inv as any).taxAmount)
          const discount = safeNumber((inv as any).discountAmount)

          acc.total += total
          acc.subtotal += subtotal
          acc.tax += tax
          acc.discount += discount

          if (isCash(method)) acc.cash += total
          else if (isCard(method)) acc.card += total
          else acc.other += total

          return acc
        },
        { total: 0, subtotal: 0, tax: 0, discount: 0, cash: 0, card: 0, other: 0 }
      )

      const wb = XLSX.utils.book_new()

      const resumenAoA: any[][] = [
        ['REPORTE DE VENTAS'],
        [`Período: ${dateRange.start} a ${dateRange.end}`],
        [],
        ['Concepto', 'Valor'],
        ['Ventas Totales (Reporte)', safeNumber((salesSummary as any).totalSales)],
        ['Transacciones (Reporte)', safeNumber((salesSummary as any).salesCount ?? (salesSummary as any).totalTransactions)],
        ['Ticket Promedio (Reporte)', safeNumber((salesSummary as any).averageTicket)],
        ['Costo Total (Reporte)', safeNumber((salesSummary as any).totalCost)],
        ['Ganancia Neta (Reporte)', safeNumber((salesSummary as any).grossProfit ?? (salesSummary as any).totalProfit)],
        ['Margen Ganancia % (Reporte)', safeNumber((salesSummary as any).profitMargin)],
        [],
        ['CIERRE (Facturas COMPLETADAS en el período)'],
        ['Total Facturado', totals.total],
        ['Subtotal', totals.subtotal],
        ['Impuestos', totals.tax],
        ['Descuentos', totals.discount],
        [],
        ['Total Efectivo', totals.cash],
        ['Total Tarjeta (Crédito + Débito)', totals.card],
        ['Otros Métodos', totals.other],
      ]

      const wsResumen = XLSX.utils.aoa_to_sheet(resumenAoA)
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

      const invoicesRows = invoices.map((inv) => ({
        Fecha: (inv as any).createdAt ? String((inv as any).createdAt).replace('T', ' ').slice(0, 19) : '',
        Numero: (inv as any).invoiceNumber || '',
        Tipo: (inv as any).invoiceType || '',
        Estado: (inv as any).status || '',
        Cliente: (inv as any).customer?.fullName || '',
        MetodoPago: getPaymentMethodLabelLocal((inv as any).paymentMethod),
        Subtotal: safeNumber((inv as any).subtotal),
        Impuesto: safeNumber((inv as any).taxAmount),
        Descuento: safeNumber((inv as any).discountAmount),
        Total: safeNumber((inv as any).total),
        Recibido: safeNumber((inv as any).amountReceived),
        Cambio: safeNumber((inv as any).changeAmount),
        UsuarioId: safeNumber((inv as any).userId),
      }))

      const wsInvoices = XLSX.utils.json_to_sheet(invoicesRows)
      XLSX.utils.book_append_sheet(wb, wsInvoices, 'Facturas')

      if (paymentMethods.length > 0) {
        const paymentRows = paymentMethods.map((m) => ({
          Metodo: getPaymentMethodLabel(m.paymentMethod),
          Transacciones: safeNumber((m as any).count),
          Total: safeNumber((m as any).totalSales ?? (m as any).total),
          Porcentaje: safeNumber((m as any).percentage),
        }))
        const wsPay = XLSX.utils.json_to_sheet(paymentRows)
        XLSX.utils.book_append_sheet(wb, wsPay, 'MetodosPago')
      }

      if (topProducts.length > 0) {
        const prodRows = topProducts.map((p) => ({
          Producto: p.productName,
          Cantidad: safeNumber(p.totalQuantity),
          Ingresos: safeNumber(p.totalRevenue),
        }))
        const wsProd = XLSX.utils.json_to_sheet(prodRows)
        XLSX.utils.book_append_sheet(wb, wsProd, 'TopProductos')
      }

      if (topCustomers.length > 0) {
        const custRows = topCustomers.map((c) => ({
          Cliente: c.customerName,
          Compras: safeNumber(c.totalPurchases),
          TotalGastado: safeNumber(c.totalSpent),
        }))
        const wsCust = XLSX.utils.json_to_sheet(custRows)
        XLSX.utils.book_append_sheet(wb, wsCust, 'TopClientes')
      }

      XLSX.writeFile(wb, `reporte_ventas_${dateRange.start}_${dateRange.end}.xlsx`)
      toast.success('Excel exportado correctamente')
    } catch (error) {
      console.error('Error exporting Excel:', error)
      toast.error('Error al exportar Excel')
    } finally {
      toast.dismiss(loadingToast)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reportes</h1>
          <p className="text-gray-500">Análisis y estadísticas de tu negocio</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-400" />
            <input
              type="date"
              className="input-field"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <span className="text-gray-400">a</span>
            <input
              type="date"
              className="input-field"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setQuickDate('today')} className="btn-ghost text-sm">Hoy</button>
            <button onClick={() => setQuickDate('week')} className="btn-ghost text-sm">Esta Semana</button>
            <button onClick={() => setQuickDate('month')} className="btn-ghost text-sm">Este Mes</button>
            <button onClick={() => setQuickDate('year')} className="btn-ghost text-sm">Este Año</button>
          </div>
          <Button variant="primary" size="sm" onClick={exportToExcel}><Download size={18} /> Exportar Excel</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center shadow-soft">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ventas Totales</p>
                  <p className="text-xl font-bold text-gray-800">{formatCurrency(salesSummary?.totalSales || 0)}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center shadow-soft">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Transacciones</p>
                  <p className="text-xl font-bold text-gray-800">{salesSummary?.totalTransactions || 0}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center shadow-soft">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ticket Promedio</p>
                  <p className="text-xl font-bold text-gray-800">{formatCurrency(salesSummary?.averageTicket || 0)}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center shadow-soft">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ganancia Neta</p>
                  <p className="text-xl font-bold text-gray-800">{formatCurrency(salesSummary?.grossProfit || salesSummary?.totalProfit || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Summary */}
          {inventorySummary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center shadow-soft">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Productos</p>
                    <p className="text-xl font-bold text-gray-800">{inventorySummary.totalProducts}</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center shadow-soft">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Stock Bajo</p>
                    <p className="text-xl font-bold text-orange-600">{inventorySummary.lowStockCount}</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center shadow-soft">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sin Stock</p>
                    <p className="text-xl font-bold text-red-600">{inventorySummary.outOfStockCount}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🏆 Productos Más Vendidos</h3>
              {topProducts.length === 0 ? (
                <p className="text-gray-400 text-center py-4">Sin datos para el período</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div key={product.productId} className="flex items-center justify-between p-3 bg-primary-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </span>
                        <span className="font-medium">{product.productName}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary-600">{formatCurrency(product.totalRevenue)}</p>
                        <p className="text-xs text-gray-500">{product.totalQuantity} unidades</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Customers */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">👥 Mejores Clientes</h3>
              {topCustomers.length === 0 ? (
                <p className="text-gray-400 text-center py-4">Sin datos para el período</p>
              ) : (
                <div className="space-y-3">
                  {topCustomers.map((customer, index) => (
                    <div key={customer.customerId} className="flex items-center justify-between p-3 bg-primary-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </span>
                        <span className="font-medium">{customer.customerName}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatCurrency(customer.totalSpent)}</p>
                        <p className="text-xs text-gray-500">{customer.totalPurchases} compras</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">💳 Métodos de Pago</h3>
            {paymentMethods.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Sin datos para el período</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {paymentMethods.map((method) => (
                  <div key={method.paymentMethod} className="p-4 bg-primary-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <CreditCard className="w-5 h-5 text-primary-600" />
                      <span className="font-medium">{getPaymentMethodLabel(method.paymentMethod)}</span>
                    </div>
                    <p className="text-xl font-bold text-primary-600">{formatCurrency((method as any).totalSales ?? (method as any).total ?? 0)}</p>
                    <p className="text-sm text-gray-500">{method.count} transacciones ({method.percentage?.toFixed(1) || 0}%)</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ReportsPage

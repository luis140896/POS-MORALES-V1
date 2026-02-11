import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Calendar, Download, BarChart3, TrendingUp, DollarSign, Loader2, Package, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '@/shared/components/ui/Button'
import { reportService, SalesSummary, TopProduct, TopCustomer, InventorySummary, PaymentMethodStat } from '@/core/api/reportService'
import { invoiceService } from '@/core/api/invoiceService'
import { RootState } from '@/app/store'
import XLSX from 'xlsx-js-style'

// Helper: local date as YYYY-MM-DD (avoids UTC shift from toISOString)
const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const ReportsPage = () => {
  const { theme, company } = useSelector((state: RootState) => state.settings)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: toLocalDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end: toLocalDateStr(new Date())
  })
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodStat[]>([])

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
      start: toLocalDateStr(start),
      end: toLocalDateStr(new Date())
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
    const isTransfer = (method?: string | null) => ['TRANSFERENCIA', 'TARJETA_CREDITO', 'TARJETA_DEBITO'].includes(method || '')

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
          else if (isTransfer(method)) acc.card += total
          else acc.other += total

          return acc
        },
        { total: 0, subtotal: 0, tax: 0, discount: 0, cash: 0, card: 0, other: 0 }
      )

      // Helper: convert hex color to ARGB (without #)
      const hexToArgb = (hex: string) => hex.replace('#', '').toUpperCase()

      // Style definitions using theme colors
      const primaryColor = hexToArgb(theme.primaryColor || '#9b87f5')
      const secondaryColor = hexToArgb(theme.secondaryColor || '#7c3aed')
      const companyName = company.companyName || 'Mi Negocio'

      const titleStyle: any = {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: secondaryColor } },
        alignment: { horizontal: 'center', vertical: 'center' },
      }

      const headerStyle: any = {
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: primaryColor } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        },
      }

      const currencyFmt = '"$"#,##0'

      const currencyStyle: any = {
        numFmt: currencyFmt,
        alignment: { horizontal: 'right' },
      }

      const labelStyle: any = {
        font: { bold: true, sz: 11 },
        alignment: { horizontal: 'left' },
      }

      const sectionStyle: any = {
        font: { bold: true, sz: 12, color: { rgb: secondaryColor } },
        fill: { fgColor: { rgb: 'F3F4F6' } },
      }

      // Helper: auto-fit column widths based on content
      const autoFitColumns = (ws: any, data: any[][], minWidth = 10) => {
        const colWidths: number[] = []
        data.forEach(row => {
          row.forEach((cell, i) => {
            const len = cell != null ? String(cell).length : 0
            colWidths[i] = Math.max(colWidths[i] || minWidth, len + 4)
          })
        })
        ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w, 50) }))
      }

      const wb = XLSX.utils.book_new()

      // === RESUMEN SHEET ===
      const resumenAoA: any[][] = [
        [companyName],
        ['REPORTE DE VENTAS'],
        [`Período: ${dateRange.start} a ${dateRange.end}`],
        [],
        ['Concepto', 'Valor'],
        ['Ventas Totales', safeNumber((salesSummary as any).totalSales)],
        ['Transacciones', safeNumber((salesSummary as any).salesCount ?? (salesSummary as any).totalTransactions)],
        ['Ticket Promedio', safeNumber((salesSummary as any).averageTicket)],
        ['Costo Total', safeNumber((salesSummary as any).totalCost)],
        ['Ganancia Neta', safeNumber((salesSummary as any).grossProfit ?? (salesSummary as any).totalProfit)],
        ['Margen Ganancia %', safeNumber((salesSummary as any).profitMargin)],
        [],
        ['CIERRE DE CAJA'],
        ['Total Facturado', totals.total],
        ['Subtotal', totals.subtotal],
        ['Impuestos', totals.tax],
        ['Descuentos', totals.discount],
        [],
        ['DESGLOSE POR MÉTODO DE PAGO'],
        ['Total Efectivo', totals.cash],
        ['Total Transferencia', totals.card],
        ['Otros Métodos', totals.other],
      ]

      const wsResumen = XLSX.utils.aoa_to_sheet(resumenAoA)
      wsResumen['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
        { s: { r: 12, c: 0 }, e: { r: 12, c: 1 } },
        { s: { r: 18, c: 0 }, e: { r: 18, c: 1 } },
      ]

      // Apply styles to Resumen
      if (wsResumen['A1']) wsResumen['A1'].s = titleStyle
      if (wsResumen['A2']) wsResumen['A2'].s = { ...titleStyle, font: { ...titleStyle.font, sz: 13 } }
      if (wsResumen['A3']) wsResumen['A3'].s = { font: { italic: true, sz: 10, color: { rgb: '666666' } }, alignment: { horizontal: 'center' } }

      // Header row (row 5)
      if (wsResumen['A5']) wsResumen['A5'].s = headerStyle
      if (wsResumen['B5']) wsResumen['B5'].s = headerStyle

      // Section headers
      if (wsResumen['A13']) wsResumen['A13'].s = sectionStyle
      if (wsResumen['A19']) wsResumen['A19'].s = sectionStyle

      // Apply label and currency styles to data rows
      const currencyRows = [5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 19, 20, 21]
      currencyRows.forEach(r => {
        const labelRef = `A${r + 1}`
        const valRef = `B${r + 1}`
        if (wsResumen[labelRef]) wsResumen[labelRef].s = labelStyle
        if (wsResumen[valRef] && typeof wsResumen[valRef].v === 'number') {
          wsResumen[valRef].s = currencyStyle
        }
      })

      autoFitColumns(wsResumen, resumenAoA, 20)
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

      // === FACTURAS SHEET ===
      const invoicesHeaders = ['Fecha', 'Número', 'Tipo', 'Estado', 'Cliente', 'Método Pago', 'Subtotal', 'Impuesto', 'Descuento', 'Total', 'Recibido', 'Cambio']
      const invoicesData = invoices.map((inv) => [
        (inv as any).createdAt ? String((inv as any).createdAt).replace('T', ' ').slice(0, 19) : '',
        (inv as any).invoiceNumber || '',
        (inv as any).invoiceType || '',
        (inv as any).status || '',
        (inv as any).customer?.fullName || '',
        getPaymentMethodLabelLocal((inv as any).paymentMethod),
        safeNumber((inv as any).subtotal),
        safeNumber((inv as any).taxAmount),
        safeNumber((inv as any).discountAmount),
        safeNumber((inv as any).total),
        safeNumber((inv as any).amountReceived),
        safeNumber((inv as any).changeAmount),
      ])
      const invoicesAoA = [invoicesHeaders, ...invoicesData]
      const wsInvoices = XLSX.utils.aoa_to_sheet(invoicesAoA)

      // Style invoice headers
      invoicesHeaders.forEach((_, i) => {
        const ref = XLSX.utils.encode_cell({ r: 0, c: i })
        if (wsInvoices[ref]) wsInvoices[ref].s = headerStyle
      })

      // Apply currency format to monetary columns (6=Subtotal, 7=Impuesto, 8=Descuento, 9=Total, 10=Recibido, 11=Cambio)
      const moneyCols = [6, 7, 8, 9, 10, 11]
      invoicesData.forEach((_, rowIdx) => {
        moneyCols.forEach(colIdx => {
          const ref = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx })
          if (wsInvoices[ref]) wsInvoices[ref].s = currencyStyle
        })
      })

      autoFitColumns(wsInvoices, invoicesAoA, 12)
      XLSX.utils.book_append_sheet(wb, wsInvoices, 'Facturas')

      // === MÉTODOS DE PAGO SHEET ===
      if (paymentMethods.length > 0) {
        const payHeaders = ['Método', 'Transacciones', 'Total', 'Porcentaje %']
        const payData = paymentMethods.map((m) => [
          getPaymentMethodLabel(m.paymentMethod),
          safeNumber((m as any).count),
          safeNumber((m as any).totalSales ?? (m as any).total),
          safeNumber((m as any).percentage),
        ])
        const payAoA = [payHeaders, ...payData]
        const wsPay = XLSX.utils.aoa_to_sheet(payAoA)
        payHeaders.forEach((_, i) => {
          const ref = XLSX.utils.encode_cell({ r: 0, c: i })
          if (wsPay[ref]) wsPay[ref].s = headerStyle
        })
        payData.forEach((_, rowIdx) => {
          const totalRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: 2 })
          if (wsPay[totalRef]) wsPay[totalRef].s = currencyStyle
        })
        autoFitColumns(wsPay, payAoA)
        XLSX.utils.book_append_sheet(wb, wsPay, 'MetodosPago')
      }

      // === TOP PRODUCTOS SHEET ===
      if (topProducts.length > 0) {
        const prodHeaders = ['Producto', 'Cantidad', 'Ingresos']
        const prodData = topProducts.map((p) => [
          p.productName,
          safeNumber(p.totalQuantity),
          safeNumber(p.totalRevenue),
        ])
        const prodAoA = [prodHeaders, ...prodData]
        const wsProd = XLSX.utils.aoa_to_sheet(prodAoA)
        prodHeaders.forEach((_, i) => {
          const ref = XLSX.utils.encode_cell({ r: 0, c: i })
          if (wsProd[ref]) wsProd[ref].s = headerStyle
        })
        prodData.forEach((_, rowIdx) => {
          const ref = XLSX.utils.encode_cell({ r: rowIdx + 1, c: 2 })
          if (wsProd[ref]) wsProd[ref].s = currencyStyle
        })
        autoFitColumns(wsProd, prodAoA)
        XLSX.utils.book_append_sheet(wb, wsProd, 'TopProductos')
      }

      // === TOP CLIENTES SHEET ===
      if (topCustomers.length > 0) {
        const custHeaders = ['Cliente', 'Compras', 'Total Gastado']
        const custData = topCustomers.map((c) => [
          c.customerName,
          safeNumber(c.totalPurchases),
          safeNumber(c.totalSpent),
        ])
        const custAoA = [custHeaders, ...custData]
        const wsCust = XLSX.utils.aoa_to_sheet(custAoA)
        custHeaders.forEach((_, i) => {
          const ref = XLSX.utils.encode_cell({ r: 0, c: i })
          if (wsCust[ref]) wsCust[ref].s = headerStyle
        })
        custData.forEach((_, rowIdx) => {
          const ref = XLSX.utils.encode_cell({ r: rowIdx + 1, c: 2 })
          if (wsCust[ref]) wsCust[ref].s = currencyStyle
        })
        autoFitColumns(wsCust, custAoA)
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
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Reportes</h1>
          <p className="text-sm sm:text-base text-gray-500">Análisis y estadísticas de tu negocio</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="card">
        <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Calendar size={20} className="text-gray-400 hidden sm:block" />
            <input
              type="date"
              className="input-field flex-1 sm:flex-none"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <span className="text-gray-400">a</span>
            <input
              type="date"
              className="input-field flex-1 sm:flex-none"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setQuickDate('today')} className="btn-ghost text-sm">Hoy</button>
            <button onClick={() => setQuickDate('week')} className="btn-ghost text-sm">Semana</button>
            <button onClick={() => setQuickDate('month')} className="btn-ghost text-sm">Mes</button>
            <button onClick={() => setQuickDate('year')} className="btn-ghost text-sm">Año</button>
          </div>
          <Button variant="primary" size="sm" onClick={exportToExcel}><Download size={18} /> Exportar</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <div className="card">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center shadow-soft flex-shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Ventas Totales</p>
                  <p className="text-base sm:text-xl font-bold text-gray-800 truncate">{formatCurrency(salesSummary?.totalSales || 0)}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center shadow-soft flex-shrink-0">
                  <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Transacciones</p>
                  <p className="text-base sm:text-xl font-bold text-gray-800">{(salesSummary as any)?.salesCount || (salesSummary as any)?.totalTransactions || 0}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center shadow-soft flex-shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Ticket Promedio</p>
                  <p className="text-base sm:text-xl font-bold text-gray-800 truncate">{formatCurrency(salesSummary?.averageTicket || 0)}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center shadow-soft flex-shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Ganancia Neta</p>
                  <p className="text-base sm:text-xl font-bold text-gray-800 truncate">{formatCurrency(salesSummary?.grossProfit || salesSummary?.totalProfit || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Summary */}
          {inventorySummary && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center shadow-soft">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Productos</p>
                    <p className="text-xl font-bold text-gray-800">{(inventorySummary as any).totalProducts || 0}</p>
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
                    <p className="text-xl font-bold text-orange-600">{(inventorySummary as any).lowStockProducts ?? (inventorySummary as any).lowStockCount ?? 0}</p>
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
                    <p className="text-xl font-bold text-red-600">{(inventorySummary as any).outOfStockProducts ?? (inventorySummary as any).outOfStockCount ?? 0}</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
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

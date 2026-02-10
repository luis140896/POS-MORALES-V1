import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Loader2,
  Calendar
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { invoiceService } from '@/core/api/invoiceService'
import { inventoryService } from '@/core/api/inventoryService'
import { dashboardService } from '@/core/api/reportService'
import { Inventory } from '@/types'

// Helper: local date as YYYY-MM-DD (avoids UTC shift from toISOString)
const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface DailySale {
  date: string
  total: number
  count: number
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const [, setLoading] = useState(true)
  const [summaryStats, setSummaryStats] = useState({ totalSales: 0, salesCount: 0, averageTicket: 0 })
  const [lowStock, setLowStock] = useState<Inventory[]>([])
  const [outOfStock, setOutOfStock] = useState<Inventory[]>([])
  const [dailySales, setDailySales] = useState<DailySale[]>([])
  const [chartLoading, setChartLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: toLocalDateStr(new Date()),
    end: toLocalDateStr(new Date()),
  })

  useEffect(() => {
    const fetchInventoryAlerts = async () => {
      try {
        const [lowStockRes, outOfStockRes] = await Promise.all([
          inventoryService.getLowStock(),
          inventoryService.getOutOfStock()
        ])
        setLowStock((lowStockRes as any) || [])
        setOutOfStock((outOfStockRes as any) || [])
      } catch (error) {
        console.error('Error fetching inventory alerts:', error)
      }
    }
    fetchInventoryAlerts()
  }, [])

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true)
        setSummaryLoading(true)
        const startDateTime = `${dateRange.start}T00:00:00`
        const endDateTime = `${dateRange.end}T23:59:59`
        const res = await dashboardService.getSalesSummary(startDateTime, endDateTime)
        const summary = res as any
        const totalSales = Number(summary?.totalSales ?? 0)
        const salesCount = Number(summary?.salesCount ?? 0)
        const averageTicket = Number(summary?.averageTicket ?? 0)
        setSummaryStats({ totalSales, salesCount, averageTicket })
      } catch (error) {
        console.error('Error fetching dashboard summary:', error)
        // Fallback: intentar con endpoint de stats de hoy
        try {
          const statsRes = await invoiceService.getTodayStats() as any
          setSummaryStats({
            totalSales: Number(statsRes?.totalSales ?? 0),
            salesCount: Number(statsRes?.salesCount ?? 0),
            averageTicket: Number(statsRes?.salesCount ?? 0) > 0
              ? Number(statsRes?.totalSales ?? 0) / Number(statsRes?.salesCount ?? 0) : 0,
          })
        } catch { /* silently fail */ }
      } finally {
        setLoading(false)
        setSummaryLoading(false)
      }
    }
    fetchSummary()
  }, [dateRange])

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setChartLoading(true)
        const startDate = new Date(`${dateRange.start}T00:00:00`)
        const endDate = new Date(`${dateRange.end}T00:00:00`)

        const res = await dashboardService.getDailySales(
          startDate.toISOString(),
          endDate.toISOString()
        )

        const salesData = (res as any as DailySale[]) || []

        const points: DailySale[] = []
        const cursor = new Date(startDate)
        while (cursor <= endDate) {
          const y = cursor.getFullYear()
          const m = String(cursor.getMonth() + 1).padStart(2, '0')
          const d = String(cursor.getDate()).padStart(2, '0')
          const dateStr = `${y}-${m}-${d}`
          const existing = salesData.find((s: any) => s.date === dateStr)
          points.push({
            date: cursor.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }),
            total: (existing as any)?.total || 0,
            count: (existing as any)?.count || 0
          })
          cursor.setDate(cursor.getDate() + 1)
        }

        setDailySales(points)
      } catch (error) {
        console.error('Error fetching chart data:', error)
        setDailySales([])
      } finally {
        setChartLoading(false)
      }
    }
    fetchChartData()
  }, [dateRange])

  const ticketPromedio = summaryStats.salesCount > 0
    ? (summaryStats.averageTicket || (summaryStats.totalSales / summaryStats.salesCount))
    : 0

  const stats = [
    { 
      label: 'Ventas', 
      value: summaryLoading ? '...' : formatCurrency(summaryStats.totalSales), 
      change: '+0%', 
      isPositive: true,
      icon: DollarSign,
      color: 'from-green-500 to-green-600'
    },
    { 
      label: 'Transacciones', 
      value: summaryLoading ? '...' : summaryStats.salesCount.toString(), 
      change: '+0%', 
      isPositive: true,
      icon: ShoppingCart,
      color: 'from-primary-500 to-primary-600'
    },
    { 
      label: 'Stock Bajo', 
      value: lowStock.length.toString(), 
      change: lowStock.length > 0 ? 'Atención' : 'OK',
      isPositive: lowStock.length === 0,
      icon: Package,
      color: 'from-amber-500 to-amber-600'
    },
    { 
      label: 'Ticket Promedio', 
      value: summaryLoading ? '...' : formatCurrency(ticketPromedio), 
      change: '+0%', 
      isPositive: true,
      icon: TrendingUp,
      color: 'from-blue-500 to-blue-600'
    },
  ]
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">Resumen de tu negocio</p>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('es-CO', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
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
            <button
              onClick={() => {
                const d = toLocalDateStr(new Date())
                setDateRange({ start: d, end: d })
              }}
              className="btn-ghost text-sm"
            >
              Hoy
            </button>
            <button
              onClick={() => {
                const end = new Date()
                const start = new Date()
                start.setDate(start.getDate() - 7)
                setDateRange({
                  start: toLocalDateStr(start),
                  end: toLocalDateStr(end),
                })
              }}
              className="btn-ghost text-sm"
            >
              Semana
            </button>
            <button
              onClick={() => {
                const now = new Date()
                const start = new Date(now.getFullYear(), now.getMonth(), 1)
                setDateRange({
                  start: toLocalDateStr(start),
                  end: toLocalDateStr(new Date()),
                })
              }}
              className="btn-ghost text-sm"
            >
              Mes
            </button>
            <button
              onClick={() => {
                const now = new Date()
                const start = new Date(now.getFullYear(), 0, 1)
                setDateRange({
                  start: toLocalDateStr(start),
                  end: toLocalDateStr(new Date()),
                })
              }}
              className="btn-ghost text-sm"
            >
              Año
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="card hover:scale-[1.02] cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center shadow-soft`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className={`flex items-center gap-1 mt-3 text-sm ${stat.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {stat.isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              <span className="font-medium">{stat.change}</span>
              <span className="text-gray-400">vs ayer</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/pos')} className="btn-secondary text-sm">Nueva Venta</button>
            <button onClick={() => navigate('/products')} className="btn-secondary text-sm">Agregar Producto</button>
            <button onClick={() => navigate('/reports')} className="btn-secondary text-sm">Ver Reportes</button>
            <button onClick={() => navigate('/inventory')} className="btn-secondary text-sm">Inventario</button>
          </div>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Alertas</h3>
          <div className="space-y-3">
            {lowStock.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => navigate('/inventory')}>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-amber-700">{lowStock.length} producto(s) con stock bajo</span>
              </div>
            )}
            {outOfStock.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl cursor-pointer hover:bg-red-100 transition-colors" onClick={() => navigate('/inventory')}>
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{outOfStock.length} producto(s) sin stock</span>
              </div>
            )}
            {lowStock.length === 0 && outOfStock.length === 0 && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-700">Todo en orden, sin alertas</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Ventas del Período</h3>
        <div className="h-64">
          {chartLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : dailySales.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySales} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9b87f5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#9b87f5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#6b7280" 
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#9b87f5" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-primary-50 rounded-xl">
              <p className="text-gray-500">No hay datos de ventas disponibles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage

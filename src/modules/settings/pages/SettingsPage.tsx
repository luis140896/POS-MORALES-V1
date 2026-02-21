import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Save, Palette, Building2, Receipt, Check, RotateCcw, Upload, Trash2, Image, Loader2, UtensilsCrossed } from 'lucide-react'
import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { RootState, AppDispatch } from '@/app/store'
import { setTheme, setCompany, setBusinessType, resetTheme, saveSettingsToBackend } from '../store/settingsSlice'
import Button from '@/shared/components/ui/Button'
import Input from '@/shared/components/ui/Input'

const SettingsPage = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { theme, company, businessType } = useSelector((state: RootState) => state.settings)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateEmail = (email: string): boolean => {
    if (!email) return true // opcional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true // opcional
    return /^[\d\s\-+()]+$/.test(phone) && phone.replace(/[\s\-+()]/g, '').length >= 7
  }

  const validateTaxId = (taxId: string): boolean => {
    if (!taxId) return true // opcional
    // Formato NIT colombiano: números con guión y dígito verificador
    return /^[\d\-]+$/.test(taxId)
  }

  const handleCompanyChange = (field: string, value: string | number) => {
    const newErrors = { ...errors }
    
    if (field === 'email' && typeof value === 'string') {
      if (!validateEmail(value)) {
        newErrors.email = 'Formato de email inválido'
      } else {
        delete newErrors.email
      }
    }
    
    if (field === 'phone' && typeof value === 'string') {
      if (!validatePhone(value)) {
        newErrors.phone = 'Teléfono debe contener solo números'
      } else {
        delete newErrors.phone
      }
    }
    
    if (field === 'taxId' && typeof value === 'string') {
      if (!validateTaxId(value)) {
        newErrors.taxId = 'NIT debe contener solo números y guiones'
      } else {
        delete newErrors.taxId
      }
    }
    
    if (field === 'taxRate' && typeof value === 'number') {
      if (value < 0 || value > 100) {
        newErrors.taxRate = 'La tasa debe estar entre 0 y 100'
      } else {
        delete newErrors.taxRate
      }
    }
    
    setErrors(newErrors)
    dispatch(setCompany({ [field]: value }))
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo debe ser menor a 2MB')
      return
    }

    setUploading(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      dispatch(setCompany({ logoUrl: base64 }))
      toast.success('Logo actualizado correctamente')
      setUploading(false)
    }
    reader.onerror = () => {
      toast.error('Error al cargar la imagen')
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    dispatch(setCompany({ logoUrl: '' }))
    toast.success('Logo eliminado')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (Object.keys(errors).length > 0) {
      toast.error('Corrige los errores antes de guardar')
      return
    }
    setSaving(true)
    try {
      await dispatch(saveSettingsToBackend()).unwrap()
      setSaved(true)
      toast.success('Configuración guardada en el servidor')
      setTimeout(() => setSaved(false), 2000)
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast.error('Error al guardar configuración en el servidor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Configuración</h1>
          <p className="text-sm sm:text-base text-gray-500">Personaliza tu sistema POS</p>
        </div>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 size={20} className="animate-spin" /> Guardando...</> : saved ? <><Check size={20} /> Guardado</> : <><Save size={20} /> Guardar Cambios</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Company Info */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Información de la Empresa</h2>
          </div>
          <div className="space-y-4">
            <Input label="Nombre del Negocio" value={company.companyName} 
              onChange={(e) => dispatch(setCompany({ companyName: e.target.value }))} />
            <Input label="Razón Social" value={company.legalName} placeholder="Opcional"
              onChange={(e) => dispatch(setCompany({ legalName: e.target.value }))} />
            <div>
              <Input label="NIT / RUT" value={company.taxId} placeholder="Ej: 900123456-1"
                onChange={(e) => handleCompanyChange('taxId', e.target.value)} />
              {errors.taxId && <p className="text-xs text-red-500 mt-1">{errors.taxId}</p>}
            </div>
            <div>
              <Input label="Teléfono" value={company.phone}
                onChange={(e) => handleCompanyChange('phone', e.target.value)} />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <Input label="Email" type="email" value={company.email}
                onChange={(e) => handleCompanyChange('email', e.target.value)} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
            <Input label="Dirección" value={company.address}
              onChange={(e) => dispatch(setCompany({ address: e.target.value }))} />
          </div>
        </div>

        {/* Theme */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <Palette className="w-5 h-5 text-primary-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Tema y Colores</h2>
            </div>
            <button
              onClick={() => {
                dispatch(resetTheme())
                toast.success('Colores restaurados a los predeterminados')
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <RotateCcw size={16} />
              Restaurar
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color Primario</label>
              <div className="flex items-center gap-3">
                <input type="color" value={theme.primaryColor} 
                  onChange={(e) => dispatch(setTheme({ primaryColor: e.target.value }))}
                  className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-200" />
                <span className="text-gray-600 font-mono">{theme.primaryColor}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Color principal de la interfaz</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color Secundario</label>
              <div className="flex items-center gap-3">
                <input type="color" value={theme.secondaryColor}
                  onChange={(e) => dispatch(setTheme({ secondaryColor: e.target.value }))}
                  className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-200" />
                <span className="text-gray-600 font-mono">{theme.secondaryColor}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Color de acentos y detalles</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color de Fondo</label>
              <div className="flex items-center gap-3">
                <input type="color" value={theme.backgroundColor}
                  onChange={(e) => dispatch(setTheme({ backgroundColor: e.target.value }))}
                  className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-200" />
                <span className="text-gray-600 font-mono">{theme.backgroundColor}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Color del fondo de la aplicación</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color de Tarjetas</label>
              <div className="flex items-center gap-3">
                <input type="color" value={theme.cardColor || '#ffffff'}
                  onChange={(e) => dispatch(setTheme({ cardColor: e.target.value }))}
                  className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-200" />
                <span className="text-gray-600 font-mono">{theme.cardColor || '#ffffff'}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Color de fondo de las tarjetas y secciones</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color del Menú Lateral</label>
              <div className="flex items-center gap-3">
                <input type="color" value={theme.sidebarColor || '#ffffff'}
                  onChange={(e) => dispatch(setTheme({ sidebarColor: e.target.value }))}
                  className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-200" />
                <span className="text-gray-600 font-mono">{theme.sidebarColor || '#ffffff'}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Color del menú de navegación lateral</p>
            </div>
          </div>
        </div>

        {/* Invoice Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Facturación</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Moneda</label>
              <select 
                className="input-field"
                value={company.currency}
                onChange={(e) => dispatch(setCompany({ currency: e.target.value }))}
              >
                <option value="COP">COP - Peso Colombiano</option>
                <option value="USD">USD - Dólar Americano</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>
            <div>
              <Input label="Tasa de Impuesto (%)" type="number" min="0" max="100" value={company.taxRate}
                onChange={(e) => handleCompanyChange('taxRate', Number(e.target.value))} />
              {errors.taxRate && <p className="text-xs text-red-500 mt-1">{errors.taxRate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Negocio</label>
              <select 
                className="input-field"
                value={businessType}
                onChange={(e) => dispatch(setBusinessType(e.target.value))}
              >
                <option value="GENERAL">General</option>
                <option value="RESTAURANTE">Restaurante</option>
                <option value="FERRETERIA">Ferretería</option>
                <option value="FARMACIA">Farmacia</option>
                <option value="SUPERMERCADO">Supermercado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Access - Table Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Configuración de Mesas</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Personaliza las zonas y estados de las mesas del restaurante
          </p>
          <Button variant="secondary" onClick={() => navigate('/settings/tables')} className="w-full">
            Configurar Zonas y Estados
          </Button>
        </div>

        {/* Logo Upload */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Logo de la Empresa</h2>
          <div className="border-2 border-dashed border-primary-200 rounded-xl p-8 text-center">
            {company.logoUrl ? (
              <div className="relative inline-block">
                <img 
                  src={company.logoUrl} 
                  alt="Logo de la empresa" 
                  className="w-32 h-32 mx-auto mb-4 object-contain rounded-xl border border-gray-200"
                />
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="Eliminar logo"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 mx-auto mb-4 bg-primary-100 rounded-xl flex items-center justify-center">
                <Image className="w-10 h-10 text-primary-400" />
              </div>
            )}
            <p className="text-gray-500 mb-2">
              {company.logoUrl ? 'Cambiar logo' : 'Arrastra tu logo aquí o'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              id="logo-upload"
            />
            <label htmlFor="logo-upload">
              <Button 
                variant="secondary" 
                size="sm" 
                className="cursor-pointer"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>Subiendo...</>
                ) : (
                  <><Upload size={16} /> Seleccionar Archivo</>
                )}
              </Button>
            </label>
            <p className="text-xs text-gray-400 mt-2">PNG, JPG hasta 2MB</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage

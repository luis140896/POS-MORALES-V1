import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { settingsService } from '@/core/api/settingsService'

interface ThemeConfig {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  cardColor: string
  sidebarColor: string
}

interface CompanyConfig {
  companyName: string
  legalName: string
  taxId: string
  logoUrl: string
  currency: string
  taxRate: number
  address: string
  phone: string
  email: string
}

interface SettingsState {
  theme: ThemeConfig
  company: CompanyConfig
  businessType: string
  isLoading: boolean
}

const STORAGE_KEY = 'pos_settings'

const loadFromStorage = (): Partial<SettingsState> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

const saveToStorage = (state: SettingsState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: state.theme,
      company: state.company,
      businessType: state.businessType
    }))
  } catch (e) {
    console.error('Error saving settings:', e)
  }
}

const defaultState: SettingsState = {
  theme: {
    primaryColor: '#9b87f5',
    secondaryColor: '#7c3aed',
    accentColor: '#c4b5fd',
    backgroundColor: '#f3e8ff',
    cardColor: '#ffffff',
    sidebarColor: '#ffffff',
  },
  company: {
    companyName: 'Mi Negocio',
    legalName: '',
    taxId: '',
    logoUrl: '',
    currency: 'COP',
    taxRate: 19,
    address: '',
    phone: '',
    email: '',
  },
  businessType: 'GENERAL',
  isLoading: false,
}

// Map backend CompanyConfig entity to frontend state
const mapBackendToState = (data: any): Partial<SettingsState> => ({
  theme: {
    primaryColor: data.primaryColor || defaultState.theme.primaryColor,
    secondaryColor: data.secondaryColor || defaultState.theme.secondaryColor,
    accentColor: data.accentColor || defaultState.theme.accentColor,
    backgroundColor: data.backgroundColor || defaultState.theme.backgroundColor,
    cardColor: data.cardColor || defaultState.theme.cardColor,
    sidebarColor: data.sidebarColor || defaultState.theme.sidebarColor,
  },
  company: {
    companyName: data.companyName || defaultState.company.companyName,
    legalName: data.legalName || '',
    taxId: data.taxId || '',
    logoUrl: data.logoUrl || '',
    currency: data.currency || 'COP',
    taxRate: data.taxRate != null ? Number(data.taxRate) : 19,
    address: data.address || '',
    phone: data.phone || '',
    email: data.email || '',
  },
  businessType: data.businessType || 'GENERAL',
})

// Async thunk: fetch settings from backend
export const fetchSettings = createAsyncThunk('settings/fetch', async () => {
  const res = await settingsService.getConfig()
  return res as any
})

// Async thunk: save settings to backend
export const saveSettingsToBackend = createAsyncThunk('settings/save', async (_, { getState }) => {
  const state = (getState() as any).settings as SettingsState
  const payload = {
    companyName: state.company.companyName,
    legalName: state.company.legalName,
    taxId: state.company.taxId,
    logoUrl: state.company.logoUrl,
    primaryColor: state.theme.primaryColor,
    secondaryColor: state.theme.secondaryColor,
    accentColor: state.theme.accentColor,
    backgroundColor: state.theme.backgroundColor,
    cardColor: state.theme.cardColor,
    sidebarColor: state.theme.sidebarColor,
    businessType: state.businessType,
    currency: state.company.currency,
    taxRate: state.company.taxRate,
    address: state.company.address,
    phone: state.company.phone,
    email: state.company.email,
  }
  const res = await settingsService.updateConfig(payload)
  return res as any
})

const savedState = loadFromStorage()
const initialState: SettingsState = {
  ...defaultState,
  ...savedState,
  theme: { ...defaultState.theme, ...savedState.theme },
  company: { ...defaultState.company, ...savedState.company },
}

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Partial<ThemeConfig>>) => {
      state.theme = { ...state.theme, ...action.payload }
      saveToStorage(state)
    },
    setCompany: (state, action: PayloadAction<Partial<CompanyConfig>>) => {
      state.company = { ...state.company, ...action.payload }
      saveToStorage(state)
    },
    setBusinessType: (state, action: PayloadAction<string>) => {
      state.businessType = action.payload
      saveToStorage(state)
    },
    setSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      const newState = { ...state, ...action.payload }
      saveToStorage(newState)
      return newState
    },
    resetTheme: (state) => {
      state.theme = defaultState.theme
      saveToStorage(state)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        const mapped = mapBackendToState(action.payload)
        state.theme = { ...state.theme, ...mapped.theme }
        state.company = { ...state.company, ...mapped.company }
        state.businessType = mapped.businessType || state.businessType
        state.isLoading = false
        saveToStorage(state)
      })
      .addCase(fetchSettings.rejected, (state) => {
        state.isLoading = false
      })
      .addCase(saveSettingsToBackend.fulfilled, (state, action) => {
        const mapped = mapBackendToState(action.payload)
        state.theme = { ...state.theme, ...mapped.theme }
        state.company = { ...state.company, ...mapped.company }
        state.businessType = mapped.businessType || state.businessType
        saveToStorage(state)
      })
  },
})

export const { setTheme, setCompany, setBusinessType, setSettings, resetTheme } = settingsSlice.actions
export default settingsSlice.reducer

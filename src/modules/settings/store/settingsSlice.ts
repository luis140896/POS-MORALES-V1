import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ThemeConfig {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
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
})

export const { setTheme, setCompany, setBusinessType, setSettings, resetTheme } = settingsSlice.actions
export default settingsSlice.reducer

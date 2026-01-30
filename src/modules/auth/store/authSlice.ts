import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { authService } from '../services/authService'

interface User {
  id: number
  username: string
  email: string
  fullName: string
  role: string
  permissions: string[]
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,
}

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error de autenticación')
    }
  }
)

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState }
      const response = await authService.refreshToken(state.auth.refreshToken!)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Error al refrescar token')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.isAuthenticated = false
      state.error = null
      localStorage.removeItem('user')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
        localStorage.setItem('user', JSON.stringify(action.payload.user))
        localStorage.setItem('accessToken', action.payload.accessToken)
        localStorage.setItem('refreshToken', action.payload.refreshToken)
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(refreshToken.fulfilled, (state, action: PayloadAction<any>) => {
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
        localStorage.setItem('accessToken', action.payload.accessToken)
        localStorage.setItem('refreshToken', action.payload.refreshToken)
      })
      .addCase(refreshToken.rejected, (state) => {
        state.user = null
        state.accessToken = null
        state.refreshToken = null
        state.isAuthenticated = false
        localStorage.removeItem('user')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      })
  },
})

export const { logout, clearError } = authSlice.actions
export default authSlice.reducer

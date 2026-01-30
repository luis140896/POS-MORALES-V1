import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@/modules/auth/store/authSlice'
import cartReducer from '@/modules/pos/store/cartSlice'
import settingsReducer from '@/modules/settings/store/settingsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

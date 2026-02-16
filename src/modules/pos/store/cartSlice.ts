import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface CartItem {
  id: number
  code: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
  notes?: string
}

interface CartState {
  items: CartItem[]
  customerId: number | null
  customerName: string
  discount: number
  discountType: 'percent' | 'amount'
  notes: string
}

const initialState: CartState = {
  items: [],
  customerId: null,
  customerName: 'Cliente General',
  discount: 0,
  discountType: 'percent',
  notes: '',
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<Omit<CartItem, 'quantity'> & { quantity?: number }>) => {
      const existingItem = state.items.find((item) => item.id === action.payload.id)
      if (existingItem) {
        existingItem.quantity += action.payload.quantity || 1
      } else {
        state.items.push({ ...action.payload, quantity: action.payload.quantity || 1 })
      }
    },
    removeItem: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((item) => item.id !== action.payload)
    },
    updateQuantity: (state, action: PayloadAction<{ id: number; quantity: number }>) => {
      const item = state.items.find((item) => item.id === action.payload.id)
      if (item) {
        item.quantity = Math.max(1, action.payload.quantity)
      }
    },
    incrementQuantity: (state, action: PayloadAction<number>) => {
      const item = state.items.find((item) => item.id === action.payload)
      if (item) {
        item.quantity += 1
      }
    },
    decrementQuantity: (state, action: PayloadAction<number>) => {
      const item = state.items.find((item) => item.id === action.payload)
      if (item && item.quantity > 1) {
        item.quantity -= 1
      }
    },
    setCustomer: (state, action: PayloadAction<{ id: number | null; name: string }>) => {
      state.customerId = action.payload.id
      state.customerName = action.payload.name
    },
    setDiscount: (state, action: PayloadAction<{ discount: number; type: 'percent' | 'amount' }>) => {
      state.discount = action.payload.discount
      state.discountType = action.payload.type
    },
    setNotes: (state, action: PayloadAction<string>) => {
      state.notes = action.payload
    },
    updateItemNotes: (state, action: PayloadAction<{ id: number; notes: string }>) => {
      const item = state.items.find((item) => item.id === action.payload.id)
      if (item) {
        item.notes = action.payload.notes
      }
    },
    clearCart: (state) => {
      state.items = []
      state.customerId = null
      state.customerName = 'Cliente General'
      state.discount = 0
      state.discountType = 'percent'
      state.notes = ''
    },
  },
})

export const {
  addItem,
  removeItem,
  updateQuantity,
  incrementQuantity,
  decrementQuantity,
  setCustomer,
  setDiscount,
  setNotes,
  updateItemNotes,
  clearCart,
} = cartSlice.actions

export const selectCartTotal = (state: { cart: CartState }) => {
  const subtotal = state.cart.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  )
  const discountAmount =
    state.cart.discountType === 'percent'
      ? subtotal * (state.cart.discount / 100)
      : state.cart.discount
  return {
    subtotal,
    discountAmount,
    total: subtotal - discountAmount,
    itemCount: state.cart.items.reduce((count, item) => count + item.quantity, 0),
  }
}

export default cartSlice.reducer

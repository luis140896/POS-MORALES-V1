import api from './axiosInstance'
import { Product, PaginatedResponse } from '@/types'

export const productService = {
  getAll: (page = 0, size = 20) => 
    api.get<PaginatedResponse<Product>>(`/products?page=${page}&size=${size}`),
  
  getActive: () => api.get<Product[]>('/products/active'),
  
  getByCategory: (categoryId: number) => 
    api.get<Product[]>(`/products/category/${categoryId}`),
  
  search: (term: string) => api.get<Product[]>(`/products/search?term=${term}`),
  
  getLowStock: () => api.get<Product[]>('/products/low-stock'),
  
  getOutOfStock: () => api.get<Product[]>('/products/out-of-stock'),
  
  getById: (id: number) => api.get<Product>(`/products/${id}`),
  
  getByCode: (code: string) => api.get<Product>(`/products/code/${code}`),
  
  getByBarcode: (barcode: string) => api.get<Product>(`/products/barcode/${barcode}`),
  
  create: (product: Partial<Product>) => api.post<Product>('/products', product),
  
  update: (id: number, product: Partial<Product>) => 
    api.put<Product>(`/products/${id}`, product),
  
  delete: (id: number) => api.delete(`/products/${id}`),

  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ url: string }>('/upload/product-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

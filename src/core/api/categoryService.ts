import api from './axiosInstance'
import { Category } from '@/types'

export interface CreateCategoryRequest {
  name: string
  description?: string
  imageUrl?: string
  parentId?: number | null
  displayOrder?: number
  isActive?: boolean
}

export interface UpdateCategoryRequest {
  name?: string
  description?: string
  imageUrl?: string
  parentId?: number | null
  displayOrder?: number
  isActive?: boolean
}

export interface ReorderCategoriesRequest {
  categoryIds: number[]
}

export const categoryService = {
  getAll: () => api.get<Category[]>('/categories'),
  
  getActive: () => api.get<Category[]>('/categories/active'),
  
  getRootCategories: () => api.get<Category[]>('/categories/root'),
  
  getById: (id: number) => api.get<Category>(`/categories/${id}`),
  
  create: (category: CreateCategoryRequest) => api.post<Category>('/categories', category),
  
  update: (id: number, category: UpdateCategoryRequest) => api.put<Category>(`/categories/${id}`, category),
  
  reorder: (payload: ReorderCategoriesRequest) => api.put<void>('/categories/reorder', payload),

  delete: (id: number) => api.delete(`/categories/${id}`),
}

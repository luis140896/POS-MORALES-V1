import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error capturado:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error en la aplicación</h1>
            <p className="text-gray-600 mb-4">Ha ocurrido un error inesperado:</p>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-48 text-red-500">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-700 transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

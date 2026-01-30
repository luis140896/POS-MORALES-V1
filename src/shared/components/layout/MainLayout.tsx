import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen flex">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout

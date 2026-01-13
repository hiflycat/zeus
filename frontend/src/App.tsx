import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './router'
import { useThemeStore } from './store/theme'
import { Toaster } from '@/components/ui-tw'
import { TooltipProvider } from '@/components/ui-tw'
import './App.css'

function App() {
  const { theme } = useThemeStore()

  // 初始化主题
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <TooltipProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
      <Toaster position="top-center" richColors closeButton />
    </TooltipProvider>
  )
}

export default App

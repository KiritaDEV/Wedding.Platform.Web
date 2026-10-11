import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './app/router'
import { AuthProvider } from './features/auth/AuthProvider'
import { ThemeProvider } from './app/theme/ThemeProvider'

const application = <RouterProvider router={router} />
const publicEventSite = /^\/e\/[^/]+\/?$/.test(window.location.pathname)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {publicEventSite ? application : <AuthProvider>{application}</AuthProvider>}
    </ThemeProvider>
  </StrictMode>,
)

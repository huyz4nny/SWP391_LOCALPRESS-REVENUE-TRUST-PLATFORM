import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { AppProviders } from './app/providers'
import { syncAuthSession } from './features/identity/authSession'
import './styles/globals.css'

// Render after the session check so a new tab does not flash the login page while borrowing auth.
void syncAuthSession().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  )
})

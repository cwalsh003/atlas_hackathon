import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Demo-only stylesheet. The condition is inlined (not isDemoMode) so the build
// folds it before resolving the import; via isDemoMode an orphan edit-*.css
// was still emitted into dist/assets.
if (import.meta.env.VITE_DEMO_MODE === '1') void import('./edit/edit.css')
if (import.meta.env.VITE_DEMO_MODE === '1') void import('./vote/vote.css')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

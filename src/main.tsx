import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { applyRenderProfile, detectRenderProfile, type RenderProfile } from './lib/renderProfile'

const detectedProfile = detectRenderProfile(navigator.userAgent)
const developmentOverride = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('renderProfile') as RenderProfile | null
  : null

applyRenderProfile(
  developmentOverride === 'full' || developmentOverride === 'lite'
    ? { profile: developmentOverride, reason: 'development-override' }
    : detectedProfile,
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

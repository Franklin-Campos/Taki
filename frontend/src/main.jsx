import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
// No importamos index.css

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
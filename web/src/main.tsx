import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyAdminThemeFromStorage } from '@/lib/adminTheme'

applyAdminThemeFromStorage()
createRoot(document.getElementById("root")!).render(<App />);

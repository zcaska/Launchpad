import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import App from './App'
import './index.css'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'

// Production only. The worker waits for every old app window to close before
// activating an update, so editing tasks never triggers an unexpected reload.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .catch(error => console.warn('Offline app setup unavailable:', error));
  });
}

// reducedMotion="user" makes motion/react honour prefers-reduced-motion itself.
// The blanket CSS override in index.css cannot do this: motion drives transforms
// via WAAPI/JS, which the `transition-duration` override does not reach.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </React.StrictMode>,
)

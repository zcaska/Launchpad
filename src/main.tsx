import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import App from './App'
import './index.css'

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
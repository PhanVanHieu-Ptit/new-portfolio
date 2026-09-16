import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Mascot } from './Mascot.jsx'
import '@fontsource/xanh-mono/400.css'
import '@fontsource/xanh-mono/400-italic.css'
import './styles.css'

function App() {
  return (
    <main>
      <section className="hero">
        <div className="copy">
          <h1>A tiny digital twin with eyes on the room.</h1>
          <p className="intro">
            Move your cursor around. The mascot follows it. Give him a boop for a
            reaction.
          </p>
        </div>
        <div className="mascot-stage">
          <Mascot
            directions="./mascots/ryan-directions.png"
            reactions="./mascots/ryan-reactions.png"
            size={280}
            label="Ryan mascot"
          />
          <span>boop me</span>
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

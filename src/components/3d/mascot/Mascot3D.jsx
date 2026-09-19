import React, { Component, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Character } from './Character.jsx'
import { PALETTE } from './palette.js'
import { Mascot } from '../../../Mascot.jsx'

const DEAD_ZONE = 70
const PAYOFFS = ['heart', 'sparkle', 'delighted']

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.warn('3D mascot failed to render, falling back to 2D mascot:', error)
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

export function Mascot3D({ directions, reactions, size = 140, className, label = 'mascot' }) {
  const [webglOk] = useState(supportsWebGL)
  const buttonRef = useRef(null)
  const aimRef = useRef({ dx: 0, dy: 0, active: false })
  const pointerRef = useRef(null)
  const timersRef = useRef([])
  const boopsRef = useRef({ count: 0, at: 0 })
  const reducedMotionRef = useRef(false)
  const [reaction, setReaction] = useState(null)
  const [boopId, setBoopId] = useState(0)

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
  }, [])

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const aim = () => {
      const button = buttonRef.current
      const pointer = pointerRef.current
      if (!button || !pointer) return

      const box = button.getBoundingClientRect()
      const dx = pointer.x - (box.left + box.width / 2)
      const dy = pointer.y - (box.top + box.height / 2)

      aimRef.current = { dx, dy, active: Math.hypot(dx, dy) >= DEAD_ZONE }
    }

    const onPointerMove = (event) => {
      pointerRef.current = { x: event.clientX, y: event.clientY }
      aim()
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('scroll', aim, { passive: true })

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('scroll', aim)
    }
  }, [])

  useEffect(() => () => timersRef.current.forEach(window.clearTimeout), [])

  const boop = () => {
    timersRef.current.forEach(window.clearTimeout)
    timersRef.current = []
    setBoopId((id) => id + 1)

    const later = (ms, next) => {
      timersRef.current.push(window.setTimeout(() => setReaction(next), ms))
    }

    const now = Date.now()
    const boops = boopsRef.current
    boops.count = now - boops.at < 1600 ? boops.count + 1 : 1
    boops.at = now

    if (boops.count >= 4) {
      boops.count = 0
      setReaction('dizzy')
      later(1100, null)
    } else {
      setReaction('blink')
      later(120, PAYOFFS[(boops.count - 1) % PAYOFFS.length])
      later(560, null)
    }
  }

  if (!webglOk) {
    return (
      <Mascot
        directions={directions}
        reactions={reactions}
        size={size}
        className={className}
        label={label}
      />
    )
  }

  const fallback = (
    <Mascot
      directions={directions}
      reactions={reactions}
      size={size}
      className={className}
      label={label}
    />
  )

  return (
    <CanvasErrorBoundary fallback={fallback}>
      <button
        ref={buttonRef}
        type="button"
        onClick={boop}
        aria-label={`Boop the ${label}`}
        className={className}
        style={{
          position: 'relative',
          display: 'block',
          flexShrink: 0,
          width: size,
          height: size,
          padding: 0,
          border: 0,
          background: 'transparent',
          appearance: 'none',
          cursor: 'pointer',
          userSelect: 'none',
          overflow: 'hidden',
        }}
      >
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <Canvas
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true }}
            camera={{ fov: 34, position: [0, -0.05, 5] }}
          >
            <hemisphereLight args={[PALETTE.pageCream, PALETTE.accent, 0.9]} />
            <directionalLight position={[3, 4, 5]} intensity={1.1} />
            <Character
              aimRef={aimRef}
              reaction={reaction}
              boopId={boopId}
              reducedMotion={reducedMotionRef.current}
            />
          </Canvas>
        </div>
      </button>
    </CanvasErrorBoundary>
  )
}

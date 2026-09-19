import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { PALETTE } from './palette.js'

const HEART_DURATION = 480
const HEART_BASE_SCALE = 0.1

// A flat heart silhouette traced with bezier curves (classic three.js Shape
// recipe) — reads correctly as a heart at small sizes, unlike a heart
// approximated from spheres/boxes which blurs into a blob/triangle when tiny.
const HEART_SHAPE = (() => {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.bezierCurveTo(0, 0, -0.5, 0.9, -1, 0)
  shape.bezierCurveTo(-1.5, -0.7, -0.5, -1.3, 0, -2.2)
  shape.bezierCurveTo(0.5, -1.3, 1.5, -0.7, 1, 0)
  shape.bezierCurveTo(0.5, 0.9, 0, 0, 0, 0)
  return shape
})()

function Heart({ eventStartRef, reducedMotion }) {
  const groupRef = useRef(null)
  const materialRef = useRef(null)

  useEffect(() => {
    if (reducedMotion && groupRef.current) {
      groupRef.current.scale.setScalar(HEART_BASE_SCALE)
      groupRef.current.position.y = 1.4
    }
  }, [reducedMotion])

  useFrame(() => {
    if (reducedMotion || !groupRef.current) return

    const elapsed = performance.now() - eventStartRef.current
    const p = Math.min(elapsed / HEART_DURATION, 1)
    const pop = p < 0.4 ? p / 0.4 : 1
    const overshoot = p < 0.4 ? 1 + Math.sin((p / 0.4) * Math.PI) * 0.25 : 1
    const fade = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1

    groupRef.current.scale.setScalar(HEART_BASE_SCALE * pop * overshoot)
    groupRef.current.position.y = 1.15 + p * 0.35
    if (materialRef.current) materialRef.current.opacity = fade
  })

  return (
    <group
      ref={groupRef}
      position={[0, 1.15, 0.2]}
      scale={reducedMotion ? HEART_BASE_SCALE : 0.0001}
    >
      <mesh position={[0, 1.1, 0]}>
        <shapeGeometry args={[HEART_SHAPE]} />
        <meshBasicMaterial
          ref={materialRef}
          color={PALETTE.accent}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

function DizzyGlints({ reducedMotion }) {
  const ref = useRef(null)

  useFrame((state) => {
    if (reducedMotion || !ref.current) return
    ref.current.rotation.y = state.clock.elapsedTime * 3
  })

  return (
    <group ref={ref} position={[0, 1.35, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i / 3) * Math.PI * 2) * 0.32,
            0,
            Math.sin((i / 3) * Math.PI * 2) * 0.32,
          ]}
        >
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial color={PALETTE.accent} />
        </mesh>
      ))}
    </group>
  )
}

export function Payoffs({ reaction, eventStartRef, reducedMotion }) {
  if (reaction === 'heart') {
    return <Heart eventStartRef={eventStartRef} reducedMotion={reducedMotion} />
  }

  if (reaction === 'sparkle') {
    return (
      <Sparkles
        count={14}
        scale={[1.1, 1.1, 1.1]}
        size={2.5}
        speed={reducedMotion ? 0 : 0.5}
        color={PALETTE.accent}
        position={[0, 1.1, 0]}
      />
    )
  }

  if (reaction === 'dizzy') {
    return <DizzyGlints reducedMotion={reducedMotion} />
  }

  return null
}

import React, { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Payoffs } from './Payoffs.jsx'
import { PALETTE } from './palette.js'

const MAX_LOOK_DIST = 260
const HEAD_MAX_YAW = 0.5
const HEAD_MAX_PITCH = 0.28
const BODY_MAX_YAW = 0.12
const HEAD_LAMBDA = 14
const BODY_LAMBDA = 7
const SQUASH_DURATION = 420
const DIZZY_DURATION = 1100

// [offset, scaleX, scaleY] — mirrors the SQUASH keyframes from the 2D mascot's
// WAAPI animation, replayed here as a hand-rolled piecewise-linear curve.
const SQUASH_POINTS = [
  [0, 1, 1],
  [0.18, 1.1, 0.86],
  [0.45, 0.95, 1.08],
  [0.72, 1.03, 0.97],
  [1, 1, 1],
]

// Fixed fan of hair-spike placements across the front-top of the head —
// approximates Ryan's messy fringe silhouette. [position, rotation].
const HAIR_SPIKES = [
  { pos: [-0.32, 0.32, 0.26], rot: [0.75, 0, 0.5] },
  { pos: [-0.22, 0.4, 0.36], rot: [0.65, 0, 0.32] },
  { pos: [-0.08, 0.44, 0.42], rot: [0.55, 0, 0.12] },
  { pos: [0.08, 0.44, 0.42], rot: [0.55, 0, -0.12] },
  { pos: [0.22, 0.4, 0.36], rot: [0.65, 0, -0.32] },
  { pos: [0.32, 0.32, 0.26], rot: [0.75, 0, -0.5] },
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function damp(current, target, lambda, delta) {
  return current + (target - current) * (1 - Math.exp(-lambda * delta))
}

function squashScale(t) {
  if (t <= 0) return [SQUASH_POINTS[0][1], SQUASH_POINTS[0][2]]
  if (t >= 1) return [1, 1]

  for (let i = 1; i < SQUASH_POINTS.length; i++) {
    const [t1, x1, y1] = SQUASH_POINTS[i]
    if (t <= t1) {
      const [t0, x0, y0] = SQUASH_POINTS[i - 1]
      const f = (t - t0) / (t1 - t0)
      return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f]
    }
  }

  return [1, 1]
}

export function Character({ aimRef, reaction, boopId, reducedMotion }) {
  const rootRef = useRef(null)
  const shouldersMeshRef = useRef(null)
  const headGroupRef = useRef(null)
  const shadowRef = useRef(null)
  const eyeGroupsRef = useRef([])
  const eventStartRef = useRef(performance.now())

  const yawRef = useRef(0)
  const pitchRef = useRef(0)
  const bodyYawRef = useRef(0)

  useEffect(() => {
    eventStartRef.current = performance.now()
  }, [boopId])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const aim = aimRef.current
    const targetYaw = aim?.active
      ? clamp(aim.dx / MAX_LOOK_DIST, -1, 1) * HEAD_MAX_YAW
      : 0
    const targetPitch = aim?.active
      ? clamp(-aim.dy / MAX_LOOK_DIST, -1, 1) * HEAD_MAX_PITCH
      : 0
    const targetBodyYaw = targetYaw * (BODY_MAX_YAW / HEAD_MAX_YAW)

    if (reducedMotion) {
      yawRef.current = targetYaw
      pitchRef.current = targetPitch
      bodyYawRef.current = targetBodyYaw
    } else {
      yawRef.current = damp(yawRef.current, targetYaw, HEAD_LAMBDA, delta)
      pitchRef.current = damp(pitchRef.current, targetPitch, HEAD_LAMBDA, delta)
      bodyYawRef.current = damp(bodyYawRef.current, targetBodyYaw, BODY_LAMBDA, delta)
    }

    if (headGroupRef.current) {
      headGroupRef.current.rotation.y = yawRef.current
      headGroupRef.current.rotation.x = pitchRef.current
    }

    if (rootRef.current) {
      rootRef.current.rotation.y = bodyYawRef.current
    }

    const bob = reducedMotion ? 0 : Math.sin(t * 1.6) * 0.02
    if (shouldersMeshRef.current) shouldersMeshRef.current.position.y = -0.42 + bob

    const elapsed = performance.now() - eventStartRef.current

    if (rootRef.current) {
      if (!reducedMotion && elapsed < SQUASH_DURATION) {
        const [sx, sy] = squashScale(elapsed / SQUASH_DURATION)
        rootRef.current.scale.set(sx, sy, sx)
      } else {
        rootRef.current.scale.set(1, 1, 1)
      }
    }

    if (reaction === 'dizzy' && !reducedMotion && rootRef.current) {
      const p = Math.min(elapsed / DIZZY_DURATION, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      rootRef.current.rotation.y = bodyYawRef.current + eased * Math.PI * 4
    }

    if (shadowRef.current) {
      const s = 1 - bob * 1.5
      shadowRef.current.scale.set(s, s, 1)
    }

    const squint =
      reaction === 'delighted'
        ? reducedMotion
          ? 1
          : Math.max(0, 1 - elapsed / 300)
        : 0
    eyeGroupsRef.current.forEach((eye) => {
      if (eye) eye.scale.y = 1 - squint * 0.85
    })
  })

  return (
    <group ref={rootRef}>
      {/* shoulders / shirt */}
      <mesh ref={shouldersMeshRef} position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.27, 0.46, 0.38, 20]} />
        <meshStandardMaterial color={PALETTE.shirt} roughness={0.8} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.27, -0.26, 0.24]}
          rotation={[0.15, 0, side * -0.32]}
        >
          <boxGeometry args={[0.16, 0.07, 0.04]} />
          <meshStandardMaterial color={PALETTE.shirtStripe} roughness={0.7} />
        </mesh>
      ))}

      {/* neck */}
      <mesh position={[0, -0.14, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.26, 16]} />
        <meshStandardMaterial color={PALETTE.skin} roughness={0.65} />
      </mesh>

      <group ref={headGroupRef} position={[0, 0.28, 0]}>
        {/* head */}
        <mesh scale={[1.05, 1, 0.95]}>
          <sphereGeometry args={[0.5, 28, 28]} />
          <meshStandardMaterial color={PALETTE.skin} roughness={0.6} />
        </mesh>

        {/* ears */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.5, -0.03, 0.02]} scale={[0.5, 1, 0.6]}>
            <sphereGeometry args={[0.13, 16, 16]} />
            <meshStandardMaterial color={PALETTE.skin} roughness={0.65} />
          </mesh>
        ))}

        {/* hair cap */}
        <mesh position={[0, 0.26, -0.1]}>
          <sphereGeometry args={[0.48, 28, 28]} />
          <meshStandardMaterial color={PALETTE.hair} roughness={0.5} />
        </mesh>

        {/* hair spikes */}
        {HAIR_SPIKES.map((spike, i) => (
          <mesh key={i} position={spike.pos} rotation={spike.rot}>
            <coneGeometry args={[0.13, 0.26, 8]} />
            <meshStandardMaterial color={PALETTE.hair} roughness={0.5} />
          </mesh>
        ))}

        {/* eyebrows */}
        {[-0.2, 0.2].map((x) => (
          <mesh
            key={x}
            position={[x, 0.19, 0.46]}
            rotation={[0, 0, x < 0 ? 0.12 : -0.12]}
          >
            <boxGeometry args={[0.16, 0.035, 0.02]} />
            <meshStandardMaterial color={PALETTE.eyebrow} roughness={0.6} />
          </mesh>
        ))}

        {/* eyes (iris + catchlight), scaled as a group for the delighted squint */}
        {[-0.2, 0.2].map((x, i) => (
          <group key={x} ref={(el) => (eyeGroupsRef.current[i] = el)} position={[x, 0.02, 0.42]}>
            <mesh>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshStandardMaterial color={PALETTE.eyeIris} roughness={0.25} />
            </mesh>
            <mesh position={[0.03, 0.04, 0.08]}>
              <sphereGeometry args={[0.028, 10, 10]} />
              <meshBasicMaterial color={PALETTE.eyeHighlight} />
            </mesh>
          </group>
        ))}

        {/* glasses */}
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, 0.02, 0.44]}>
            <torusGeometry args={[0.13, 0.018, 10, 24]} />
            <meshStandardMaterial color={PALETTE.glasses} roughness={0.35} metalness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 0.02, 0.44]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, 0.14, 8]} />
          <meshStandardMaterial color={PALETTE.glasses} roughness={0.35} metalness={0.4} />
        </mesh>
        {[-0.34, 0.34].map((x) => (
          <mesh key={x} position={[x, 0.02, 0.34]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 8]} />
            <meshStandardMaterial color={PALETTE.glasses} roughness={0.35} metalness={0.4} />
          </mesh>
        ))}

        {/* blush */}
        {[-0.34, 0.34].map((x) => (
          <mesh key={x} position={[x, -0.1, 0.4]} scale={[1, 0.6, 0.35]}>
            <sphereGeometry args={[0.11, 12, 12]} />
            <meshStandardMaterial
              color={PALETTE.blush}
              roughness={0.9}
              transparent
              opacity={0.7}
            />
          </mesh>
        ))}

        {/* mouth: half-torus flipped to a smile curve */}
        <mesh position={[0, -0.22, 0.47]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.085, 0.018, 8, 16, Math.PI]} />
          <meshStandardMaterial color={PALETTE.mouth} roughness={0.6} />
        </mesh>
      </group>

      <mesh ref={shadowRef} position={[0, -0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.48, 32]} />
        <meshBasicMaterial color={PALETTE.ink} transparent opacity={0.16} />
      </mesh>

      <Payoffs reaction={reaction} eventStartRef={eventStartRef} reducedMotion={reducedMotion} />
    </group>
  )
}

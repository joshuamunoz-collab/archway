import { useState } from 'react'

export function ToggleSwitch({ defaultOn = false, onToggle }) {
  const [on, setOn] = useState(defaultOn)

  function toggle() {
    setOn(!on)
    onToggle?.(!on)
  }

  return (
    <button
      onClick={toggle}
      className="relative w-11 h-6 rounded-full transition-colors duration-150 cursor-pointer flex-shrink-0"
      style={{
        background: on ? '#4f6ef7' : 'rgba(255,255,255,0.1)',
      }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-150"
        style={{
          transform: on ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  )
}

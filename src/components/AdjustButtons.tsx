import { useCallback } from 'react'
import type { Position, SpellSlot } from '../types'
import { useTimerStore } from '../store/timerStore'

interface AdjustButtonsProps {
    position: Position
    slot: SpellSlot
    active: boolean
}

export default function AdjustButtons({
    position,
    slot,
    active,
}: AdjustButtonsProps) {
    const adjustTimer = useTimerStore((s) => s.adjustTimer)

    const handleAdjust = useCallback(
        (seconds: number) => {
            adjustTimer(position, slot, seconds)
        },
        [position, slot, adjustTimer],
    )

    if (!active) return null

    return (
        <div className="adjust-buttons">
            <button
                className="adjust-btn"
                onClick={() => handleAdjust(-2)}
                title="-2 seconds"
            >
                -2
            </button>
            <button
                className="adjust-btn"
                onClick={() => handleAdjust(2)}
                title="+2 seconds"
            >
                +2
            </button>
        </div>
    )
}

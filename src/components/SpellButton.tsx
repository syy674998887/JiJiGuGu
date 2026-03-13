import { useCallback } from 'react'
import type { Position, SpellSlot, SpellTimer } from '../types'
import { useTimerStore } from '../store/timerStore'
import { useTickingTimer } from '../hooks/useTickingTimer'
import { SPELL_ICON_KEYS, getSpellIconUrl } from '../utils/icons'
import { formatTime } from '../utils/format'

interface SpellButtonProps {
    position: Position
    slot: SpellSlot
    spell: SpellTimer
}

export default function SpellButton({
    position,
    slot,
    spell,
}: SpellButtonProps) {
    useTickingTimer()

    const startTimer = useTimerStore((s) => s.startTimer)
    const resetTimer = useTimerStore((s) => s.resetTimer)
    const adjustTimer = useTimerStore((s) => s.adjustTimer)
    const reactionDelay = useTimerStore((s) => s.reactionDelay)

    const now = Date.now()
    const remaining = spell.active
        ? Math.max(0, Math.ceil((spell.endsAt - now) / 1000))
        : 0

    const isActive = spell.active && remaining > 0

    const handleClick = useCallback(async () => {
        if (isActive) {
            // Already counting down: shorten by reaction delay
            adjustTimer(position, slot, -reactionDelay)
        } else {
            await startTimer(position, slot)
        }
    }, [position, slot, startTimer, adjustTimer, reactionDelay, isActive])

    const handleContextMenu = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            resetTimer(position, slot)
        },
        [position, slot, resetTimer],
    )

    const spellIconKey = SPELL_ICON_KEYS[spell.spellName] || ''
    const iconUrl = getSpellIconUrl(spellIconKey)

    const stateClass = isActive ? 'spell-cooldown' : 'spell-ready'

    return (
        <button
            className={`spell-button ${stateClass}`}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
        >
            {iconUrl && (
                <img
                    className="spell-icon"
                    src={iconUrl}
                    alt={spell.spellName}
                    draggable={false}
                    onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                />
            )}
            <div className="spell-info">
                {isActive ? (
                    <span className="spell-countdown">
                        {formatTime(remaining)}
                    </span>
                ) : (
                    <svg className="spell-ready-check" viewBox="0 0 24 24" width="14" height="14">
                        <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                )}
            </div>
        </button>
    )
}

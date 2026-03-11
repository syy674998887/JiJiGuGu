import { useCallback, useState, useEffect } from 'react'
import type { Position, SpellSlot, SpellTimer } from '../types'
import { useTimerStore } from '../store/timerStore'
import { useTickingTimer } from '../hooks/useTickingTimer'
import { SPELL_ICON_KEYS, getSpellIconUrl } from '../utils/icons'
import { formatTime } from '../utils/spells'
import { formatComebackTime } from '../utils/format'

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
    const [readyFlash, setReadyFlash] = useState(false)

    const now = Date.now()
    const remaining = spell.active
        ? Math.max(0, Math.ceil((spell.endsAt - now) / 1000))
        : 0

    const isActive = spell.active && remaining > 0
    const isReady = spell.active && remaining <= 0

    useEffect(() => {
        if (isReady) {
            setReadyFlash(true)
            const timeout = setTimeout(() => {
                setReadyFlash(false)
                resetTimer(position, slot)
            }, 3000)
            return () => clearTimeout(timeout)
        }
    }, [isReady, position, slot, resetTimer])

    const handleClick = useCallback(async () => {
        await startTimer(position, slot)
        // Clipboard is auto-managed by useAutoClipboard
    }, [position, slot, startTimer])

    const handleContextMenu = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            resetTimer(position, slot)
        },
        [position, slot, resetTimer],
    )

    const spellIconKey = SPELL_ICON_KEYS[spell.spellName] || ''
    const iconUrl = getSpellIconUrl(spellIconKey)

    let stateClass = 'spell-idle'
    if (isActive) stateClass = 'spell-cooldown'
    if (readyFlash) stateClass = 'spell-ready'

    return (
        <button
            className={`spell-button ${stateClass}`}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            title={`${spell.spellName} — Left click: start timer, Right click: reset`}
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
                {isActive && (
                    <>
                        <span className="spell-countdown">
                            {formatTime(remaining)}
                        </span>
                        {spell.comebackGameTime !== null && (
                            <span className="spell-comeback">
                                →{formatComebackTime(spell.comebackGameTime)}
                            </span>
                        )}
                    </>
                )}
                {readyFlash && <span className="spell-ready-check">✓</span>}
                {!isActive && !readyFlash && (
                    <span className="spell-idle-text">--:--</span>
                )}
            </div>
        </button>
    )
}

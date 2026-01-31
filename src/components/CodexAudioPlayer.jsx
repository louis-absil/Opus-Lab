import React, { useState, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import { chordToNotes, progressionToToneSequence } from '../utils/chordToNotes'
import { Play, Square } from 'lucide-react'
import './CodexAudioPlayer.css'

/**
 * Bouton Écouter qui joue un exemple (accord ou progression) via Tone.js.
 * Audio ne démarre qu'au premier clic (politique navigateur).
 * @param {Object} example - { chords, tonality, mode }
 * @param {boolean} [disabled] - Désactiver le bouton
 */
function CodexAudioPlayer({ example, disabled = false }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const synthRef = useRef(null)
  const partRef = useRef(null)

  const startToneOnce = useCallback(() => {
    if (Tone.context.state !== 'running') {
      Tone.start()
    }
  }, [])

  const stop = useCallback(() => {
    try {
      if (partRef.current) {
        partRef.current.stop(0)
        partRef.current.dispose()
        partRef.current = null
      }
      if (synthRef.current) {
        synthRef.current.releaseAll()
      }
      setIsPlaying(false)
    } catch (_) {
      setIsPlaying(false)
    }
  }, [])

  const play = useCallback(() => {
    if (!example?.chords?.length) return
    startToneOnce()
    if (isPlaying) {
      stop()
      return
    }
    const tonality = example.tonality || 'C'
    const mode = example.mode || 'major'
    const octave = 4
    try {
      if (!synthRef.current) {
        synthRef.current = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.8 }
        }).toDestination()
      }
      const synth = synthRef.current
      const seq = progressionToToneSequence(example.chords, tonality, mode, octave, '2n')
      if (seq.length === 0) return
      setIsPlaying(true)
      const part = new Tone.Part((time, notes) => {
        synth.triggerAttackRelease(notes, '2n', time)
      }, seq)
      part.loop = false
      part.start(0)
      partRef.current = part
      const durationMs = (seq.length + 1) * 1000
      setTimeout(() => {
        stop()
      }, durationMs)
    } catch (err) {
      setIsPlaying(false)
    }
  }, [example, isPlaying, startToneOnce, stop])

  const handleClick = () => {
    if (isPlaying) stop()
    else play()
  }

  return (
    <button
      type="button"
      className={`codex-audio-btn ${isPlaying ? 'codex-audio-btn--playing' : ''}`}
      onClick={handleClick}
      onBlur={() => {}}
      disabled={disabled || !example?.chords?.length}
      aria-label={isPlaying ? 'Arrêter la lecture' : 'Écouter l\'exemple'}
    >
      {isPlaying ? (
        <Square size={18} aria-hidden />
      ) : (
        <Play size={18} aria-hidden />
      )}
      <span className="codex-audio-label">{isPlaying ? 'Arrêter' : 'Écouter'}</span>
    </button>
  )
}

export default CodexAudioPlayer

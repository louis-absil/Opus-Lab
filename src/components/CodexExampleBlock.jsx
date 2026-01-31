import React from 'react'
import CodexNotation from './CodexNotation'
import PianoKeyboard from './PianoKeyboard'
import CodexAudioPlayer from './CodexAudioPlayer'
import { progressionToNotes } from '../utils/chordToNotes'
import { Music, Piano } from 'lucide-react'
import './CodexExampleBlock.css'

/**
 * Bloc d'exemple : description + partition + clavier + bouton Écouter.
 * @param {Object} example - { id, description, chords, abc, tonality, mode }
 */
function CodexExampleBlock({ example }) {
  if (!example) return null

  const tonality = example.tonality || 'C'
  const mode = example.mode || 'major'
  const highlightedNotes = progressionToNotes(example.chords || [], tonality, mode, 4)

  return (
    <div className="codex-example-block">
      <h4 className="codex-example-title">
        <Music size={18} aria-hidden />
        {example.description}
      </h4>
      {example.abc && (
        <div className="codex-example-notation">
          <CodexNotation abcString={example.abc} />
        </div>
      )}
      <div className="codex-example-keyboard">
        <span className="codex-example-keyboard-label">
          <Piano size={16} aria-hidden />
          Clavier
        </span>
        <PianoKeyboard highlightedNotes={highlightedNotes} />
      </div>
      <div className="codex-example-audio">
        <CodexAudioPlayer example={example} />
      </div>
    </div>
  )
}

export default CodexExampleBlock

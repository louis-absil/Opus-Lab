import { useState } from 'react'
import './InstructionsIOS.css'

function InstructionsIOS({ onPaste, onClose }) {
  const [activeMethod, setActiveMethod] = useState('app') // 'app' ou 'safari'

  return (
    <div className="ios-instructions-overlay" onClick={onClose}>
      <div className="ios-instructions-card" onClick={(e) => e.stopPropagation()}>
        <div className="ios-instructions-header">
          <h2>Comment copier l'URL sur iOS</h2>
          <button 
            className="ios-instructions-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="ios-instructions-tabs">
          <button
            className={`ios-instructions-tab ${activeMethod === 'app' ? 'active' : ''}`}
            onClick={() => setActiveMethod('app')}
          >
            App YouTube
          </button>
          <button
            className={`ios-instructions-tab ${activeMethod === 'safari' ? 'active' : ''}`}
            onClick={() => setActiveMethod('safari')}
          >
            Safari
          </button>
        </div>

        <div className="ios-instructions-content">
          {activeMethod === 'app' ? (
            <div className="ios-instructions-method">
              <h3>Si YouTube s'ouvre dans l'app native</h3>
              <ol className="ios-instructions-steps">
                <li>Trouvez votre vidéo sur YouTube</li>
                <li>Appuyez sur le bouton <strong>"Partager"</strong> (icône flèche vers le haut, sous la vidéo)</li>
                <li>Dans le menu, sélectionnez <strong>"Copier le lien"</strong> ou <strong>"Copy Link"</strong></li>
                <li>Revenez dans Opus Lab</li>
                <li>Appuyez sur <strong>"📋 Coller l'URL YouTube"</strong> OU appuyez longuement dans le champ et sélectionnez <strong>"Coller"</strong></li>
              </ol>
            </div>
          ) : (
            <div className="ios-instructions-method">
              <h3>Si YouTube s'ouvre dans Safari (navigateur)</h3>
              <ol className="ios-instructions-steps">
                <li>Trouvez votre vidéo sur YouTube dans Safari</li>
                <li>Appuyez sur la <strong>barre d'adresse</strong> en haut pour afficher l'URL complète</li>
                <li>Appuyez <strong>longuement</strong> sur l'URL</li>
                <li>Sélectionnez <strong>"Copier"</strong> dans le menu contextuel</li>
                <li>Revenez dans Opus Lab</li>
                <li>Appuyez sur <strong>"📋 Coller l'URL YouTube"</strong> OU appuyez longuement dans le champ et sélectionnez <strong>"Coller"</strong></li>
              </ol>
            </div>
          )}
        </div>

        <div className="ios-instructions-footer">
          <button
            className="ios-instructions-btn-primary"
            onClick={onPaste}
          >
            📋 Coller maintenant
          </button>
          <button
            className="ios-instructions-btn-secondary"
            onClick={onClose}
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  )
}

export default InstructionsIOS


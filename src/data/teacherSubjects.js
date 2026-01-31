/**
 * Liste des matières enseignées par les professeurs (référence CNSM / HEM / HEMU / conservatoires).
 * Liste statique en v1 ; pas de collection Firestore ni demandes de validation.
 * Inclut les matières théoriques et l'option « Enseignement instrumental » pour les profs d'instrument.
 */

export const TEACHER_SUBJECTS = [
  // Formation musicale et solfège
  'Formation musicale',
  'Solfège',
  'Lecture à vue',
  'Dictée musicale',
  // Harmonie et écriture (CNSM : Harmonie, Contrepoint, Fugue, Polyphonie, Écriture XXe-XXIe)
  'Harmonie',
  'Harmonie au clavier',
  'Basse chiffrée',
  'Écriture (contrepoint, fugue)',
  'Polyphonie des XVe-XVIIe siècles',
  'Orchestration',
  // Analyse et culture (CNSM : Analyse théorique et appliquée ; HEM/HEMU : culture, forme)
  'Analyse',
  'Histoire de la musique',
  'Culture musicale',
  'Forme sonate',
  'Théorie musicale',
  // Pratique et improvisation
  'Improvisation',
  'Accompagnement',
  // Enseignement instrumental (profs qui n'enseignent pas de matière théorique)
  'Enseignement instrumental',
]

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { getRelevantChordIndices } from '../utils/nodeCriteria'
import { validateAnswerWithFunctions } from '../utils/riemannFunctions'
import { NODE_PREREQUISITES, PARCOURS_NODE_ORDER } from '../data/parcoursTree'

export { NODE_PREREQUISITES }

const VALID_NODE_IDS = new Set(PARCOURS_NODE_ORDER)

/** Migration : cadence-demi / cadence-parfaite → cadence-demi-et-parfaite ; autres anciens IDs → réinitialiser */
function migrateProgressIfNeeded(progress) {
  let unlocked = progress.unlockedNodes || []
  const hadCadenceDemi = unlocked.includes('cadence-demi')
  const hadCadenceParfaite = unlocked.includes('cadence-parfaite')
  const otherOldIds = unlocked.filter((id) => !VALID_NODE_IDS.has(id) && id !== 'cadence-demi' && id !== 'cadence-parfaite')
  if (otherOldIds.length > 0) {
    return {
      ...progress,
      unlockedNodes: ['1.1'],
      nodeStats: {
        '1.1': {
          attempts: 0,
          successes: 0,
          consecutiveSuccesses: 0,
          averageScore: 0,
          masteryLevel: 'beginner',
          progressionMode: 'functions',
          unlocked: true,
          unlockedAt: progress.nodeStats?.['1.1']?.unlockedAt || serverTimestamp(),
          lastAttemptAt: null
        }
      },
      updatedAt: serverTimestamp()
    }
  }
  if (!hadCadenceDemi && !hadCadenceParfaite) return progress
  unlocked = unlocked.filter((id) => VALID_NODE_IDS.has(id))
  if (!unlocked.includes('cadence-demi-et-parfaite')) {
    unlocked.push('cadence-demi-et-parfaite')
    unlocked.sort((a, b) => PARCOURS_NODE_ORDER.indexOf(a) - PARCOURS_NODE_ORDER.indexOf(b))
  }
  const nodeStats = { ...progress.nodeStats }
  if (hadCadenceDemi || hadCadenceParfaite) {
    const prev = nodeStats['cadence-demi'] || nodeStats['cadence-parfaite'] || {}
    nodeStats['cadence-demi-et-parfaite'] = nodeStats['cadence-demi-et-parfaite'] || prev
  }
  delete nodeStats['cadence-demi']
  delete nodeStats['cadence-parfaite']
  return {
    ...progress,
    unlockedNodes: unlocked,
    nodeStats,
    updatedAt: serverTimestamp()
  }
}

/**
 * Initialise la progression d'un utilisateur
 */
async function initializeUserProgress(userId) {
  const progressData = {
    userId,
    unlockedNodes: ['1.1'], // Seul le premier nœud est débloqué
    nodeStats: {
      '1.1': {
        attempts: 0,
        successes: 0,
        consecutiveSuccesses: 0,
        averageScore: 0,
        masteryLevel: 'beginner',
        progressionMode: 'functions',
        unlocked: true,
        unlockedAt: serverTimestamp(),
        lastAttemptAt: null
      }
    },
    updatedAt: serverTimestamp()
  }
  
  const progressRef = doc(db, 'userProgress', userId)
  await setDoc(progressRef, progressData)
  
  return progressData
}

/**
 * Récupère la progression d'un utilisateur
 */
export async function getUserProgress(userId) {
  try {
    const progressRef = doc(db, 'userProgress', userId)
    const progressDoc = await getDoc(progressRef)

    if (!progressDoc.exists()) {
      return await initializeUserProgress(userId)
    }

    const data = { id: progressDoc.id, ...progressDoc.data() }
    const migrated = migrateProgressIfNeeded(data)
    if (migrated !== data) {
      await setDoc(progressRef, {
        userId: migrated.userId,
        unlockedNodes: migrated.unlockedNodes,
        nodeStats: migrated.nodeStats,
        updatedAt: migrated.updatedAt
      })
      return migrated
    }
    return data
  } catch (error) {
    console.error('Erreur lors de la récupération de la progression:', error)
    throw error
  }
}

/**
 * Calcule le niveau de maîtrise à partir du score moyen
 */
function calculateMasteryLevel(averageScore) {
  if (averageScore < 70) return 'beginner'
  if (averageScore < 85) return 'intermediate'
  return 'advanced'
}

/**
 * Calcule le mode de progression à partir du niveau de maîtrise
 */
function calculateProgressionMode(masteryLevel) {
  if (masteryLevel === 'beginner') return 'functions'
  if (masteryLevel === 'intermediate') return 'qcm'
  return 'full'
}

/**
 * Met à jour la progression d'un nœud après un exercice
 */
export async function updateNodeProgress(userId, nodeId, nodeScore, relevantChordsCount) {
  try {
    const progress = await getUserProgress(userId)
    
    // Initialiser les stats du nœud si elles n'existent pas
    if (!progress.nodeStats[nodeId]) {
      progress.nodeStats[nodeId] = {
        attempts: 0,
        successes: 0,
        consecutiveSuccesses: 0,
        averageScore: 0,
        masteryLevel: 'beginner',
        progressionMode: 'functions',
        unlocked: false,
        unlockedAt: null,
        lastAttemptAt: null
      }
    }
    
    const nodeStats = progress.nodeStats[nodeId]
    
    // Mettre à jour les stats
    nodeStats.attempts += 1
    nodeStats.lastAttemptAt = serverTimestamp()
    
    // Considérer comme succès si score >= 70%
    const isSuccess = nodeScore >= 70
    if (isSuccess) {
      nodeStats.successes += 1
      nodeStats.consecutiveSuccesses += 1
    } else {
      nodeStats.consecutiveSuccesses = 0
    }
    
    // Recalculer le score moyen
    // Score moyen = (ancien score moyen * (attempts - 1) + nouveau score) / attempts
    nodeStats.averageScore = (
      (nodeStats.averageScore * (nodeStats.attempts - 1)) + nodeScore
    ) / nodeStats.attempts
    
    // Recalculer le niveau de maîtrise et le mode
    nodeStats.masteryLevel = calculateMasteryLevel(nodeStats.averageScore)
    nodeStats.progressionMode = calculateProgressionMode(nodeStats.masteryLevel)
    
    // Mettre à jour dans Firestore
    const progressRef = doc(db, 'userProgress', userId)
    await updateDoc(progressRef, {
      nodeStats: progress.nodeStats,
      updatedAt: serverTimestamp()
    })
    
    // Vérifier si un nouveau nœud peut être débloqué
    await checkAndUnlockNodes(userId, progress)
    
    return nodeStats
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la progression:', error)
    throw error
  }
}

/**
 * Vérifie si un nœud peut être débloqué
 */
function canUnlockNode(nodeId, progress) {
  const prerequisites = NODE_PREREQUISITES[nodeId] || []
  
  // Vérifier que tous les prérequis sont débloqués et maîtrisés
  for (const prereqNodeId of prerequisites) {
    const prereqStats = progress.nodeStats[prereqNodeId]
    
    // Le nœud prérequis doit être débloqué
    if (!prereqStats || !prereqStats.unlocked) {
      return false
    }
    
    // Le nœud prérequis doit être maîtrisé (score >= 70% sur 3 consécutifs ou 5 au total)
    const hasConsecutiveSuccesses = prereqStats.consecutiveSuccesses >= 3
    const hasTotalSuccesses = prereqStats.successes >= 5 && prereqStats.averageScore >= 70
    
    if (!hasConsecutiveSuccesses && !hasTotalSuccesses) {
      return false
    }
  }
  
  return true
}

/**
 * Vérifie et débloque les nœuds éligibles
 */
async function checkAndUnlockNodes(userId, progress) {
  const allNodeIds = Object.keys(NODE_PREREQUISITES)
  let hasNewUnlocks = false
  
  for (const nodeId of allNodeIds) {
    // Ignorer si déjà débloqué
    if (progress.unlockedNodes.includes(nodeId)) {
      continue
    }
    
    // Vérifier si le nœud peut être débloqué
    if (canUnlockNode(nodeId, progress)) {
      // Initialiser les stats du nœud si nécessaire
      if (!progress.nodeStats[nodeId]) {
        progress.nodeStats[nodeId] = {
          attempts: 0,
          successes: 0,
          consecutiveSuccesses: 0,
          averageScore: 0,
          masteryLevel: 'beginner',
          progressionMode: 'functions',
          unlocked: true,
          unlockedAt: serverTimestamp(),
          lastAttemptAt: null
        }
      } else {
        progress.nodeStats[nodeId].unlocked = true
        progress.nodeStats[nodeId].unlockedAt = serverTimestamp()
      }
      
      // Ajouter à la liste des nœuds débloqués
      if (!progress.unlockedNodes.includes(nodeId)) {
        progress.unlockedNodes.push(nodeId)
        hasNewUnlocks = true
      }
    }
  }
  
  // Mettre à jour dans Firestore si de nouveaux nœuds ont été débloqués
  if (hasNewUnlocks) {
    const progressRef = doc(db, 'userProgress', userId)
    await updateDoc(progressRef, {
      unlockedNodes: progress.unlockedNodes,
      nodeStats: progress.nodeStats,
      updatedAt: serverTimestamp()
    })
  }
  
  return hasNewUnlocks
}

/**
 * Calcule le score d'un exercice uniquement sur les accords pris en compte (pertinents et remplissables).
 * @param {Object} options - Options : functionOnlyAvailable, fillableIndices (si fourni, seuls ces indices comptent ; sinon tous les pertinents)
 */
export function calculateNodeScore(nodeId, userAnswers, correctAnswers, exercise, options = {}) {
  const relevantIndices = options.fillableIndices != null
    ? options.fillableIndices
    : getRelevantChordIndices(nodeId, exercise)
  
  if (relevantIndices.length === 0) {
    return 0
  }
  
  let totalScore = 0
  let maxScore = 0
  
  relevantIndices.forEach((index) => {
    const userAnswer = userAnswers[index]
    const correctAnswer = correctAnswers[index]
    
    if (correctAnswer) {
      maxScore += 100
      if (correctAnswer.cadence) maxScore += 10
      
      if (userAnswer) {
        const validation = validateAnswerWithFunctions(
          userAnswer,
          correctAnswer,
          userAnswer.selectedFunction || userAnswer.function || null,
          { functionOnlyAvailable: options.functionOnlyAvailable }
        )
        totalScore += validation.score + (validation.cadenceBonus || 0)
      }
      // Si userAnswer est null, on ajoute 0 (accord non rempli = erreur)
    }
  })
  
  return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
}

/**
 * Obtient le mode de progression pour un nœud
 */
export async function getProgressionMode(userId, nodeId) {
  const progress = await getUserProgress(userId)
  const nodeStats = progress.nodeStats[nodeId]
  
  if (!nodeStats) {
    return 'functions' // Mode par défaut
  }
  
  return nodeStats.progressionMode || 'functions'
}

/**
 * Vérifie si un nœud est débloqué
 */
export async function isNodeUnlocked(userId, nodeId) {
  const progress = await getUserProgress(userId)
  return progress.unlockedNodes.includes(nodeId)
}

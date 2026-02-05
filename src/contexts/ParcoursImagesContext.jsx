import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { PARCOURS_IMAGE_URLS } from '../data/parcoursIllustrations'
import { getParcoursImageOverrides, setParcoursImageEntry } from '../services/parcoursImagesService'

const ParcoursImagesContext = createContext(null)

export function ParcoursImagesProvider({ children }) {
  const [overrides, setOverrides] = useState({})
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getParcoursImageOverrides()
      setOverrides(data)
    } catch (err) {
      console.warn('ParcoursImagesContext refresh:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const imageEntries = { ...PARCOURS_IMAGE_URLS, ...overrides }

  const saveEntry = useCallback(async (nodeId, entry) => {
    await setParcoursImageEntry(nodeId, entry)
    await refresh()
  }, [refresh])

  const value = { imageEntries, isLoading, saveEntry, refresh }

  return (
    <ParcoursImagesContext.Provider value={value}>
      {children}
    </ParcoursImagesContext.Provider>
  )
}

export function useParcoursImages() {
  const ctx = useContext(ParcoursImagesContext)
  if (!ctx) {
    throw new Error('useParcoursImages must be used within ParcoursImagesProvider')
  }
  return ctx
}

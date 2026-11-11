import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { readStored, writeStored } from '../lib/storage'
import { isValidStudentId } from './studentId'

const STORAGE_KEY = 'admission.studentId'

interface StudentContextValue {
  /** The student the page is acting for, or null until a valid number is entered. */
  studentId: string | null
  setStudentId: (studentId: string | null) => void
  /** The id input, so other screens can send the user to it ("enter your number first"). */
  inputRef: RefObject<HTMLInputElement | null>
  /** Scrolls to the id box, opens it for editing and focuses it. */
  askForStudentId: () => void
  /** Bumped by askForStudentId so the bar can react (open the editor, show the hint). */
  askCount: number
}

const StudentContext = createContext<StudentContextValue | null>(null)

/**
 * There is no login: the student's birth registration number is the identity. It is kept
 * in localStorage so that after a refresh, or closing and reopening the browser, the
 * student still sees their applications.
 */
export function StudentProvider({ children, initialStudentId }: { children: ReactNode; initialStudentId?: string | null }) {
  const [studentId, setStudentIdState] = useState<string | null>(() => {
    if (initialStudentId !== undefined) return initialStudentId
    const stored = readStored(STORAGE_KEY)
    return isValidStudentId(stored) ? stored : null
  })
  const [askCount, setAskCount] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const setStudentId = useCallback((next: string | null) => {
    writeStored(STORAGE_KEY, next)
    setStudentIdState(next)
  }, [])

  const askForStudentId = useCallback(() => setAskCount((count) => count + 1), [])

  const value = useMemo(
    () => ({ studentId, setStudentId, inputRef, askForStudentId, askCount }),
    [studentId, setStudentId, askForStudentId, askCount],
  )

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
}

export function useStudent(): StudentContextValue {
  const context = useContext(StudentContext)
  if (!context) throw new Error('useStudent must be used inside <StudentProvider>.')
  return context
}

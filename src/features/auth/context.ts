import type { Session } from '@supabase/supabase-js'
import { createContext } from 'react'

export interface AuthState {
  /** `undefined` mientras se lee la sesión guardada. */
  session: Session | null | undefined
}

export const AuthContext = createContext<AuthState>({ session: undefined })

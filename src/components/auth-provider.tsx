"use client"

import * as React from "react"
import { onAuthStateChanged, type User } from "firebase/auth"

import { auth } from "@/lib/firebase"
import { saveUserProfile } from "@/features/users/services/users.service"

type AuthState = {
  user: User | null
  loading: boolean
}

const AuthContext = React.createContext<AuthState>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    loading: true,
  })

  React.useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        setState({ user, loading: false })
        if (user) {
          saveUserProfile(user).catch((err) =>
            console.error("Failed to save user profile", err)
          )
        }
      }),
    []
  )

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return React.useContext(AuthContext)
}

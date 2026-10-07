/** Public profile stored in `users/{uid}`, written on every sign-in. */
export type UserProfile = {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
}

export function getUserLabel(user: Pick<UserProfile, "displayName" | "email">) {
  return user.displayName || user.email || "Unknown user"
}

import { useState } from 'react'

const SESSION_KEY = 'casco_admin_session'

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => localStorage.getItem(SESSION_KEY) === '1'
  )

  function login(id: string, password: string): boolean {
    if (id === 'CascoBay' && password === 'Casco@123') {
      localStorage.setItem(SESSION_KEY, '1')
      setIsAuthenticated(true)
      return true
    }
    return false
  }

  function logout(): void {
    localStorage.removeItem(SESSION_KEY)
    setIsAuthenticated(false)
  }

  return { isAuthenticated, login, logout }
}

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { authAPI } from '../services/api'

// Mock the API
vi.mock('../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    getProfile: vi.fn(),
    verifyToken: vi.fn(),
  }
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Test component to access auth context
const TestComponent = () => {
  const { user, login, logout, loading, isAuthenticated } = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('should provide initial state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    expect(screen.getByTestId('user')).toHaveTextContent('no-user')
  })

  it('should handle successful login', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'student',
      firstName: 'Test',
      lastName: 'User',
      isActive: true
    }
    const mockToken = 'mock-token'

    vi.mocked(authAPI.login).mockResolvedValue({
      data: { user: mockUser, token: mockToken }
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const loginButton = screen.getByText('Login')
    await userEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith('token', mockToken)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser))
  })

  it('should handle demo mode login', async () => {
    vi.mocked(authAPI.login).mockRejectedValue(new Error('Network error'))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const loginButton = screen.getByText('Login')
    await userEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('user')).toHaveTextContent('admin@labsyncpro.com')
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith('demoMode', 'true')
  })

  it('should handle logout', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'student',
      firstName: 'Test',
      lastName: 'User',
      isActive: true
    }

    // Set initial authenticated state
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'mock-token'
      if (key === 'user') return JSON.stringify(mockUser)
      return null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const logoutButton = screen.getByText('Logout')
    await userEvent.click(logoutButton)

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
    })

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('user')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('demoMode')
  })

  it('should restore user from localStorage on initialization', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'student',
      firstName: 'Test',
      lastName: 'User',
      isActive: true
    }
    const mockToken = 'mock-token'

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return mockToken
      if (key === 'user') return JSON.stringify(mockUser)
      return null
    })

    vi.mocked(authAPI.getProfile).mockResolvedValue({
      data: { user: mockUser }
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })
  })

  it('should handle demo mode on initialization', async () => {
    const demoUser = {
      id: 'demo-admin',
      firstName: 'Demo',
      lastName: 'Admin',
      email: 'admin@labsyncpro.com',
      role: 'admin' as const,
      isActive: true
    }

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'demoMode') return 'true'
      if (key === 'token') return 'demo-token'
      if (key === 'user') return JSON.stringify(demoUser)
      return null
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('user')).toHaveTextContent('admin@labsyncpro.com')
    })
  })
})

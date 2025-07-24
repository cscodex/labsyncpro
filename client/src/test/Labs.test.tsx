import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Labs from '../components/labs/Labs'
import { AuthProvider } from '../contexts/AuthContext'
import { labAPI } from '../services/api'

// Mock the API
vi.mock('../services/api', () => ({
  labAPI: {
    getAll: vi.fn(),
  }
}))

// Mock AuthContext with demo user
vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../contexts/AuthContext')
  return {
    ...actual,
    useAuth: () => ({
      user: { id: '1', email: 'admin@labsyncpro.com', role: 'admin' },
      isAuthenticated: true,
      loading: false,
    })
  }
})

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('Labs Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading state initially', () => {
    vi.mocked(labAPI.getAll).mockImplementation(() => new Promise(() => {})) // Never resolves

    renderWithProviders(<Labs />)

    expect(screen.getByText('Loading labs...')).toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('should render labs when data is loaded', async () => {
    const mockLabs = [
      {
        id: '1',
        name: 'Lab 1',
        description: 'Computer Lab 1',
        totalComputers: 15,
        availableComputers: 12,
        totalSeats: 50,
        availableSeats: 35,
        status: 'active',
        equipment: ['Computers', 'Projector', 'Whiteboard']
      },
      {
        id: '2',
        name: 'Lab 2',
        description: 'Computer Lab 2',
        totalComputers: 19,
        availableComputers: 15,
        totalSeats: 50,
        availableSeats: 40,
        status: 'active',
        equipment: ['Computers', 'Smart Board', 'Audio System']
      }
    ]

    vi.mocked(labAPI.getAll).mockResolvedValue({ data: mockLabs })

    renderWithProviders(<Labs />)

    await waitFor(() => {
      expect(screen.getByText('Lab Management')).toBeInTheDocument()
      expect(screen.getByText('Lab 1')).toBeInTheDocument()
      expect(screen.getByText('Lab 2')).toBeInTheDocument()
    })

    // Check lab details
    expect(screen.getByText('15 Computers')).toBeInTheDocument()
    expect(screen.getByText('19 Computers')).toBeInTheDocument()
    expect(screen.getByText('12 Available')).toBeInTheDocument()
    expect(screen.getByText('15 Available')).toBeInTheDocument()
  })

  it('should use demo data when API fails', async () => {
    vi.mocked(labAPI.getAll).mockRejectedValue(new Error('Network error'))

    renderWithProviders(<Labs />)

    await waitFor(() => {
      expect(screen.getByText('Lab Management')).toBeInTheDocument()
      expect(screen.getByText('Lab 1')).toBeInTheDocument()
      expect(screen.getByText('Lab 2')).toBeInTheDocument()
    })

    // Should show demo data
    expect(screen.getByText('Computer Lab 1')).toBeInTheDocument()
    expect(screen.getByText('Computer Lab 2')).toBeInTheDocument()
  })

  it('should display equipment for each lab', async () => {
    vi.mocked(labAPI.getAll).mockRejectedValue(new Error('Use demo data'))

    renderWithProviders(<Labs />)

    await waitFor(() => {
      expect(screen.getByText('Computers')).toBeInTheDocument()
      expect(screen.getByText('Projector')).toBeInTheDocument()
      expect(screen.getByText('Whiteboard')).toBeInTheDocument()
    })
  })

  it('should show status indicators', async () => {
    vi.mocked(labAPI.getAll).mockRejectedValue(new Error('Use demo data'))

    renderWithProviders(<Labs />)

    await waitFor(() => {
      const statusElements = screen.getAllByText('Active')
      expect(statusElements.length).toBeGreaterThan(0)
    })
  })

  it('should display availability statistics', async () => {
    vi.mocked(labAPI.getAll).mockRejectedValue(new Error('Use demo data'))

    renderWithProviders(<Labs />)

    await waitFor(() => {
      // Check for availability fractions (demo data shows 12/15 and 45/50)
      expect(screen.getByText('12/15')).toBeInTheDocument() // functional computers
      expect(screen.getByText('45/50')).toBeInTheDocument() // available seats
    })
  })

  it('should render action buttons', async () => {
    vi.mocked(labAPI.getAll).mockRejectedValue(new Error('Use demo data'))

    renderWithProviders(<Labs />)

    await waitFor(() => {
      const viewButtons = screen.getAllByText('View Details')
      const scheduleButtons = screen.getAllByText('Schedule')

      expect(viewButtons.length).toBeGreaterThan(0)
      expect(scheduleButtons.length).toBeGreaterThan(0)
    })
  })
})

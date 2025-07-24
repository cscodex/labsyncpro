import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Grades from '../components/grades/Grades'
import { AuthProvider } from '../contexts/AuthContext'
import { gradeAPI } from '../services/api'

// Mock the API
vi.mock('../services/api', () => ({
  gradeAPI: {
    getAll: vi.fn(),
    updateGrade: vi.fn(),
  }
}))

// Mock AuthContext with instructor user
vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../contexts/AuthContext')
  return {
    ...actual,
    useAuth: () => ({
      user: { id: '1', email: 'instructor@labsyncpro.com', role: 'instructor' },
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

describe('Grades Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading state initially', () => {
    vi.mocked(gradeAPI.getAll).mockImplementation(() => new Promise(() => {}))

    renderWithProviders(<Grades />)

    expect(screen.getByText('Loading grades...')).toBeInTheDocument()
  })

  it('should render grades when data is loaded', async () => {
    vi.mocked(gradeAPI.getAll).mockRejectedValue(new Error('Use demo data'))

    renderWithProviders(<Grades />)

    await waitFor(() => {
      expect(screen.getByText('Grading System')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Jane Smith should be visible when switching to "All" or "Graded" filter
    const allTab = screen.getByText(/All/)
    await userEvent.click(allTab)

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('should filter grades by status', async () => {
    vi.mocked(gradeAPI.getAll).mockRejectedValue(new Error('Use demo data'))

    renderWithProviders(<Grades />)

    await waitFor(() => {
      expect(screen.getByText('Grading System')).toBeInTheDocument()
    })

    // Initially shows pending filter
    expect(screen.getByText('John Doe')).toBeInTheDocument() // pending submission

    // Click graded filter
    const gradedTab = screen.getByText(/Graded/)
    await userEvent.click(gradedTab)

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument() // graded submission
    })
  })

  it('should search grades by student name', async () => {
    vi.mocked(gradeAPI.getAll).mockRejectedValue(new Error('Use demo data'))

    renderWithProviders(<Grades />)

    await waitFor(() => {
      expect(screen.getByText('Grading System')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/Search by student name/)
    await userEvent.type(searchInput, 'John')

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })
  })

  it('should open grading modal when grade button is clicked', async () => {
    vi.mocked(gradeAPI.getAll).mockRejectedValue(new Error('Use demo data'))

    renderWithProviders(<Grades />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Find the view button (👁️) since grading is disabled
    const viewButtons = screen.getAllByText('👁️')
    await userEvent.click(viewButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Grade Submission')).toBeInTheDocument()
      expect(screen.getByText('Web Development Practical')).toBeInTheDocument()
    })
  })

  it('should display submission details in modal', async () => {
    vi.mocked(gradeAPI.getAll).mockRejectedValue(new Error('Use demo data'))

    renderWithProviders(<Grades />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    const gradeButton = screen.getByText('Grade')
    await userEvent.click(gradeButton)

    await waitFor(() => {
      expect(screen.getByText('Student:')).toBeInTheDocument()
      expect(screen.getByText('John Doe (12345678)')).toBeInTheDocument()
      expect(screen.getByText('Lab:')).toBeInTheDocument()
      expect(screen.getByText('Lab 1')).toBeInTheDocument()
    })
  })

  it('should allow score input and feedback', async () => {
    vi.mocked(gradeAPI.getAll).mockRejectedValue(new Error('Use demo data'))

    renderWithProviders(<Grades />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    const gradeButton = screen.getByText('Grade')
    await userEvent.click(gradeButton)

    await waitFor(() => {
      expect(screen.getByLabelText('Score:')).toBeInTheDocument()
      expect(screen.getByLabelText('Feedback:')).toBeInTheDocument()
    })

    const scoreInput = screen.getByLabelText('Score:')
    const feedbackInput = screen.getByLabelText('Feedback:')

    await userEvent.clear(scoreInput)
    await userEvent.type(scoreInput, '85')
    await userEvent.type(feedbackInput, 'Good work on the project!')

    expect(scoreInput).toHaveValue(85)
    expect(feedbackInput).toHaveValue('Good work on the project!')
  })

  it('should save grade and update status', async () => {
    vi.mocked(gradeAPI.getAll).mockRejectedValue(new Error('Use demo data'))

    renderWithProviders(<Grades />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    const gradeButton = screen.getByText('Grade')
    await userEvent.click(gradeButton)

    await waitFor(() => {
      expect(screen.getByLabelText('Score:')).toBeInTheDocument()
    })

    const scoreInput = screen.getByLabelText('Score:')
    const feedbackInput = screen.getByLabelText('Feedback:')
    const saveButton = screen.getByText('Save Grade')

    await userEvent.clear(scoreInput)
    await userEvent.type(scoreInput, '90')
    await userEvent.type(feedbackInput, 'Excellent work!')

    await userEvent.click(saveButton)

    // Modal should close and grade should be updated
    await waitFor(() => {
      expect(screen.queryByText('Grade Submission')).not.toBeInTheDocument()
    })
  })

  it('should close modal when cancel is clicked', async () => {
    vi.mocked(gradeAPI.getAll).mockRejectedValue(new Error('Use demo data'))

    renderWithProviders(<Grades />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    const gradeButton = screen.getByText('Grade')
    await userEvent.click(gradeButton)

    await waitFor(() => {
      expect(screen.getByText('Grade Submission')).toBeInTheDocument()
    })

    const cancelButton = screen.getByText('Cancel')
    await userEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText('Grade Submission')).not.toBeInTheDocument()
    })
  })

  it('should display graded submissions with scores', async () => {
    vi.mocked(gradeAPI.getAll).mockRejectedValue(new Error('Use demo data'))

    renderWithProviders(<Grades />)

    await waitFor(() => {
      expect(screen.getByText('Grading System')).toBeInTheDocument()
    })

    // Switch to graded tab
    const gradedTab = screen.getByText(/Graded/)
    await userEvent.click(gradedTab)

    await waitFor(() => {
      expect(screen.getByText('85/100')).toBeInTheDocument()
      expect(screen.getByText('(85%)')).toBeInTheDocument()
    })
  })
})

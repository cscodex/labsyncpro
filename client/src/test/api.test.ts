import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import { authAPI, labAPI, scheduleAPI, submissionAPI, gradeAPI } from '../services/api'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('API Services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('authAPI', () => {
    it('should login with email and password', async () => {
      const mockResponse = {
        data: {
          user: { id: '1', email: 'test@example.com', role: 'student' },
          token: 'mock-token'
        }
      }
      
      mockedAxios.post.mockResolvedValue(mockResponse)

      const result = await authAPI.login('test@example.com', 'password')

      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password'
      })
      expect(result).toEqual(mockResponse)
    })

    it('should verify token', async () => {
      const mockResponse = {
        data: { user: { id: '1', email: 'test@example.com', role: 'student' } }
      }
      
      localStorage.setItem('token', 'mock-token')
      mockedAxios.get.mockResolvedValue(mockResponse)

      const result = await authAPI.verifyToken()

      expect(mockedAxios.get).toHaveBeenCalledWith('/auth/verify')
      expect(result).toEqual(mockResponse)
    })

    it('should register new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password',
        name: 'Test User',
        role: 'student'
      }
      
      const mockResponse = {
        data: {
          user: { id: '1', ...userData },
          token: 'mock-token'
        }
      }
      
      mockedAxios.post.mockResolvedValue(mockResponse)

      const result = await authAPI.register(userData)

      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/register', userData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('labAPI', () => {
    it('should get all labs', async () => {
      const mockLabs = [
        { id: '1', name: 'Lab 1', totalComputers: 15 },
        { id: '2', name: 'Lab 2', totalComputers: 19 }
      ]
      
      mockedAxios.get.mockResolvedValue({ data: mockLabs })

      const result = await labAPI.getAll()

      expect(mockedAxios.get).toHaveBeenCalledWith('/labs')
      expect(result.data).toEqual(mockLabs)
    })

    it('should get lab by id', async () => {
      const mockLab = { id: '1', name: 'Lab 1', totalComputers: 15 }
      
      mockedAxios.get.mockResolvedValue({ data: mockLab })

      const result = await labAPI.getById('1')

      expect(mockedAxios.get).toHaveBeenCalledWith('/labs/1')
      expect(result.data).toEqual(mockLab)
    })

    it('should create new lab', async () => {
      const labData = { name: 'New Lab', totalComputers: 20 }
      const mockResponse = { data: { id: '3', ...labData } }
      
      mockedAxios.post.mockResolvedValue(mockResponse)

      const result = await labAPI.create(labData)

      expect(mockedAxios.post).toHaveBeenCalledWith('/labs', labData)
      expect(result).toEqual(mockResponse)
    })

    it('should update lab', async () => {
      const labData = { name: 'Updated Lab', totalComputers: 25 }
      const mockResponse = { data: { id: '1', ...labData } }
      
      mockedAxios.put.mockResolvedValue(mockResponse)

      const result = await labAPI.update('1', labData)

      expect(mockedAxios.put).toHaveBeenCalledWith('/labs/1', labData)
      expect(result).toEqual(mockResponse)
    })

    it('should delete lab', async () => {
      mockedAxios.delete.mockResolvedValue({ data: { success: true } })

      const result = await labAPI.delete('1')

      expect(mockedAxios.delete).toHaveBeenCalledWith('/labs/1')
      expect(result.data.success).toBe(true)
    })
  })

  describe('scheduleAPI', () => {
    it('should get all schedules', async () => {
      const mockSchedules = [
        { id: '1', title: 'Web Dev Lab', date: '2024-01-15' },
        { id: '2', title: 'Database Lab', date: '2024-01-16' }
      ]
      
      mockedAxios.get.mockResolvedValue({ data: mockSchedules })

      const result = await scheduleAPI.getAll()

      expect(mockedAxios.get).toHaveBeenCalledWith('/schedules')
      expect(result.data).toEqual(mockSchedules)
    })

    it('should create new schedule', async () => {
      const scheduleData = { title: 'New Lab', date: '2024-01-17', labId: '1' }
      const mockResponse = { data: { id: '3', ...scheduleData } }
      
      mockedAxios.post.mockResolvedValue(mockResponse)

      const result = await scheduleAPI.create(scheduleData)

      expect(mockedAxios.post).toHaveBeenCalledWith('/schedules', scheduleData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('submissionAPI', () => {
    it('should get all submissions', async () => {
      const mockSubmissions = [
        { id: '1', studentId: '1', scheduleId: '1', status: 'submitted' },
        { id: '2', studentId: '2', scheduleId: '1', status: 'pending' }
      ]
      
      mockedAxios.get.mockResolvedValue({ data: mockSubmissions })

      const result = await submissionAPI.getAll()

      expect(mockedAxios.get).toHaveBeenCalledWith('/submissions')
      expect(result.data).toEqual(mockSubmissions)
    })

    it('should create new submission', async () => {
      const submissionData = { scheduleId: '1', content: 'My submission' }
      const mockResponse = { data: { id: '3', ...submissionData } }
      
      mockedAxios.post.mockResolvedValue(mockResponse)

      const result = await submissionAPI.create(submissionData)

      expect(mockedAxios.post).toHaveBeenCalledWith('/submissions', submissionData)
      expect(result).toEqual(mockResponse)
    })

    it('should upload file', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      const formData = new FormData()
      formData.append('file', file)
      formData.append('submissionId', '1')
      
      const mockResponse = { data: { filename: 'test.txt', url: '/uploads/test.txt' } }
      
      mockedAxios.post.mockResolvedValue(mockResponse)

      const result = await submissionAPI.uploadFile('1', file)

      expect(mockedAxios.post).toHaveBeenCalledWith('/submissions/upload', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('gradeAPI', () => {
    it('should get all grades', async () => {
      const mockGrades = [
        { id: '1', submissionId: '1', score: 85, feedback: 'Good work' },
        { id: '2', submissionId: '2', score: 92, feedback: 'Excellent' }
      ]
      
      mockedAxios.get.mockResolvedValue({ data: mockGrades })

      const result = await gradeAPI.getAll()

      expect(mockedAxios.get).toHaveBeenCalledWith('/grades')
      expect(result.data).toEqual(mockGrades)
    })

    it('should update grade', async () => {
      const gradeData = { score: 90, feedback: 'Great improvement' }
      const mockResponse = { data: { id: '1', ...gradeData } }
      
      mockedAxios.put.mockResolvedValue(mockResponse)

      const result = await gradeAPI.updateGrade('1', gradeData)

      expect(mockedAxios.put).toHaveBeenCalledWith('/grades/1', gradeData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('Request Interceptors', () => {
    it('should add authorization header when token exists', () => {
      localStorage.setItem('token', 'mock-token')
      
      // Trigger the request interceptor
      const config = { headers: {} }
      const interceptor = mockedAxios.interceptors.request.use.mock.calls[0][0]
      const result = interceptor(config)

      expect(result.headers.Authorization).toBe('Bearer mock-token')
    })

    it('should not add authorization header when token does not exist', () => {
      localStorage.removeItem('token')
      
      const config = { headers: {} }
      const interceptor = mockedAxios.interceptors.request.use.mock.calls[0][0]
      const result = interceptor(config)

      expect(result.headers.Authorization).toBeUndefined()
    })
  })
})

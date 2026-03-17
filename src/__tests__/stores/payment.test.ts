import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePaymentStore } from '../../stores/payment'
import { paymentApi } from '../../api/payment'

vi.mock('../../api/payment', () => ({
  paymentApi: {
    create: vi.fn(),
    verify: vi.fn(),
    listByClient: vi.fn(),
    listByAccount: vi.fn(),
    get: vi.fn(),
  },
  SIFRE_PLACANJA: [],
}))

const mockPayment = {
  id: '1',
  racunPosiljaocaId: '10',
  racunPrimaocaBroj: '111111111111111111',
  iznos: 5000,
  sifraPlacanja: '289',
  pozivNaBroj: '97-123',
  svrha: 'Kirija',
  status: 'u_obradi',
  verifikacioniKod: '123456',
  vremeTransakcije: '2026-03-01T10:00:00Z',
}

describe('usePaymentStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('createPayment returns created payment', async () => {
    vi.mocked(paymentApi.create).mockResolvedValueOnce({
      data: { payment: mockPayment },
    })

    const store = usePaymentStore()
    const result = await store.createPayment({
      racunPosiljaocaId: 10,
      racunPrimaocaBroj: '111111111111111111',
      iznos: 5000,
      sifraPlacanja: '289',
      pozivNaBroj: '97-123',
      svrha: 'Kirija',
    })

    expect(result).toEqual(mockPayment)
    expect(paymentApi.create).toHaveBeenCalledOnce()
  })

  it('verifyPayment returns verified payment', async () => {
    const verified = { ...mockPayment, status: 'uspesno' }
    vi.mocked(paymentApi.verify).mockResolvedValueOnce({
      data: { payment: verified },
    })

    const store = usePaymentStore()
    const result = await store.verifyPayment('1', '123456')

    expect(result.status).toBe('uspesno')
    expect(paymentApi.verify).toHaveBeenCalledWith('1', '123456')
  })

  it('fetchByClient sets payments on success', async () => {
    vi.mocked(paymentApi.listByClient).mockResolvedValueOnce({
      data: { payments: [mockPayment], total: 1 },
    })

    const store = usePaymentStore()
    await store.fetchByClient('5')

    expect(store.payments).toHaveLength(1)
    expect(store.total).toBe(1)
    expect(store.loading).toBe(false)
    expect(store.error).toBe('')
  })

  it('fetchByClient calls API with correct clientId and pagination', async () => {
    vi.mocked(paymentApi.listByClient).mockResolvedValueOnce({
      data: { payments: [], total: 0 },
    })

    const store = usePaymentStore()
    await store.fetchByClient('42', { status: 'uspesno' })

    expect(paymentApi.listByClient).toHaveBeenCalledWith('42', {
      status: 'uspesno',
      page: 1,
      pageSize: 20,
    })
  })

  it('fetchByClient sets error on API failure', async () => {
    vi.mocked(paymentApi.listByClient).mockRejectedValueOnce({
      response: { data: { message: 'Forbidden' } },
    })

    const store = usePaymentStore()
    await store.fetchByClient('5')

    expect(store.payments).toHaveLength(0)
    expect(store.error).toBe('Forbidden')
    expect(store.loading).toBe(false)
  })

  it('sets loading true during fetch and false after', async () => {
    let resolve!: (v: any) => void
    vi.mocked(paymentApi.listByClient).mockReturnValueOnce(
      new Promise(r => { resolve = r })
    )

    const store = usePaymentStore()
    const promise = store.fetchByClient('5')
    expect(store.loading).toBe(true)

    resolve({ data: { payments: [], total: 0 } })
    await promise
    expect(store.loading).toBe(false)
  })

  it('clearError resets error', async () => {
    vi.mocked(paymentApi.listByClient).mockRejectedValueOnce({
      response: { data: { message: 'Error!' } },
    })

    const store = usePaymentStore()
    await store.fetchByClient('5')
    expect(store.error).toBe('Error!')

    store.clearError()
    expect(store.error).toBe('')
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRecipientStore } from '../../stores/recipient'
import { recipientApi } from '../../api/recipient'

vi.mock('../../api/recipient', () => ({
  recipientApi: {
    listByClient: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockRecipients = [
  { id: '1', clientId: '5', naziv: 'Ana Jović', brojRacuna: '111111111111111111' },
  { id: '2', clientId: '5', naziv: 'EPS', brojRacuna: '222222222222222222' },
]

describe('useRecipientStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchRecipients sets recipients on success', async () => {
    vi.mocked(recipientApi.listByClient).mockResolvedValueOnce({
      data: { recipients: mockRecipients },
    })

    const store = useRecipientStore()
    await store.fetchRecipients('5')

    expect(store.recipients).toHaveLength(2)
    expect(store.loading).toBe(false)
    expect(store.error).toBe('')
  })

  it('fetchRecipients calls API with correct clientId', async () => {
    vi.mocked(recipientApi.listByClient).mockResolvedValueOnce({
      data: { recipients: [] },
    })

    const store = useRecipientStore()
    await store.fetchRecipients('42')

    expect(recipientApi.listByClient).toHaveBeenCalledWith('42')
  })

  it('fetchRecipients sets error on API failure', async () => {
    vi.mocked(recipientApi.listByClient).mockRejectedValueOnce({
      response: { data: { message: 'Unauthorized' } },
    })

    const store = useRecipientStore()
    await store.fetchRecipients('5')

    expect(store.recipients).toHaveLength(0)
    expect(store.error).toBe('Unauthorized')
    expect(store.loading).toBe(false)
  })

  it('sets loading true during fetch and false after', async () => {
    let resolve!: (v: any) => void
    vi.mocked(recipientApi.listByClient).mockReturnValueOnce(
      new Promise(r => { resolve = r })
    )

    const store = useRecipientStore()
    const promise = store.fetchRecipients('5')
    expect(store.loading).toBe(true)

    resolve({ data: { recipients: [] } })
    await promise
    expect(store.loading).toBe(false)
  })

  it('createRecipient returns new recipient and adds to list', async () => {
    const newRecipient = { id: '3', clientId: '5', naziv: 'Novi', brojRacuna: '333333333333333333' }
    vi.mocked(recipientApi.create).mockResolvedValueOnce({
      data: { recipient: newRecipient },
    })

    const store = useRecipientStore()
    const result = await store.createRecipient('5', 'Novi', '333333333333333333')

    expect(result).toEqual(newRecipient)
    expect(store.recipients).toContainEqual(newRecipient)
  })

  it('updateRecipient updates the entry in the list', async () => {
    vi.mocked(recipientApi.listByClient).mockResolvedValueOnce({
      data: { recipients: [...mockRecipients] },
    })
    const updated = { ...mockRecipients[0], naziv: 'Ana Izmenjeno' }
    vi.mocked(recipientApi.update).mockResolvedValueOnce({
      data: { recipient: updated },
    })

    const store = useRecipientStore()
    await store.fetchRecipients('5')
    await store.updateRecipient('1', 'Ana Izmenjeno', '111111111111111111')

    expect(store.recipients[0].naziv).toBe('Ana Izmenjeno')
  })

  it('deleteRecipient removes the entry from the list', async () => {
    vi.mocked(recipientApi.listByClient).mockResolvedValueOnce({
      data: { recipients: [...mockRecipients] },
    })
    vi.mocked(recipientApi.delete).mockResolvedValueOnce({})

    const store = useRecipientStore()
    await store.fetchRecipients('5')
    await store.deleteRecipient('1')

    expect(store.recipients).toHaveLength(1)
    expect(store.recipients.find(r => r.id === '1')).toBeUndefined()
  })

  it('clearError resets error', async () => {
    vi.mocked(recipientApi.listByClient).mockRejectedValueOnce({
      response: { data: { message: 'Error!' } },
    })

    const store = useRecipientStore()
    await store.fetchRecipients('5')
    expect(store.error).toBe('Error!')

    store.clearError()
    expect(store.error).toBe('')
  })
})

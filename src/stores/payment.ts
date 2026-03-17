import { defineStore } from 'pinia'
import { ref } from 'vue'
import { paymentApi, type PaymentItem, type CreatePaymentPayload, type PaymentFilter } from '../api/payment'

export const usePaymentStore = defineStore('payment', () => {
  const payments = ref<PaymentItem[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = 20
  const loading = ref(false)
  const error = ref('')

  async function createPayment(data: CreatePaymentPayload): Promise<PaymentItem> {
    const res = await paymentApi.create(data)
    return res.data.payment
  }

  async function verifyPayment(paymentId: string, verificationCode: string): Promise<PaymentItem> {
    const res = await paymentApi.verify(paymentId, verificationCode)
    return res.data.payment
  }

  async function fetchByClient(clientId: string, filter: PaymentFilter = {}) {
    loading.value = true
    error.value = ''
    try {
      const res = await paymentApi.listByClient(clientId, { ...filter, page: page.value, pageSize })
      payments.value = res.data.payments ?? []
      total.value = Number(res.data.total ?? 0)
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Failed to load payments.'
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = ''
  }

  return { payments, total, page, pageSize, loading, error, createPayment, verifyPayment, fetchByClient, clearError }
})

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePaymentStore } from '../../stores/payment'
import { useClientAuthStore } from '../../stores/clientAuth'
import type { PaymentItem } from '../../api/payment'

const router = useRouter()
const clientAuthStore = useClientAuthStore()
const paymentStore = usePaymentStore()

const clientId = computed(() => String(clientAuthStore.client?.id ?? ''))

// Detail modal
const selectedPayment = ref<PaymentItem | null>(null)

function openDetail(p: PaymentItem) {
  selectedPayment.value = p
}

function closeDetail() {
  selectedPayment.value = null
}

// Filters
const filter = ref({ status: '', dateFrom: '', dateTo: '' })

async function applyFilter() {
  paymentStore.page = 1
  await paymentStore.fetchByClient(clientId.value, {
    status:   filter.value.status   || undefined,
    dateFrom: filter.value.dateFrom || undefined,
    dateTo:   filter.value.dateTo   || undefined,
  })
}

async function prevPage() {
  if (paymentStore.page > 1) {
    paymentStore.page--
    await applyFilter()
  }
}

async function nextPage() {
  if (paymentStore.page * paymentStore.pageSize < paymentStore.total) {
    paymentStore.page++
    await applyFilter()
  }
}

const totalPages = computed(() =>
  Math.ceil(paymentStore.total / paymentStore.pageSize) || 1
)

function statusBadgeClass(status: string) {
  switch (status) {
    case 'uspesno':    return 'badge-success'
    case 'neuspesno':  return 'badge-error'
    case 'u_obradi':   return 'badge-warning'
    case 'stornirano': return 'badge-neutral'
    default:           return 'badge-neutral'
  }
}

onMounted(async () => {
  if (clientId.value) await paymentStore.fetchByClient(clientId.value)
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Plaćanja</h1>
      <button class="btn btn-primary" @click="router.push('/client/payments/new')">+ Novo plaćanje</button>
    </div>

    <div class="card">
      <div class="card-body">

        <!-- Filters -->
        <div class="filter-row">
          <select v-model="filter.status" class="form-input filter-input" @change="applyFilter">
            <option value="">Svi statusi</option>
            <option value="u_obradi">U obradi</option>
            <option value="uspesno">Uspešno</option>
            <option value="neuspesno">Neuspešno</option>
            <option value="stornirano">Stornirano</option>
          </select>
          <input v-model="filter.dateFrom" type="date" class="form-input filter-input" @change="applyFilter" />
          <input v-model="filter.dateTo"   type="date" class="form-input filter-input" @change="applyFilter" />
        </div>

        <div v-if="paymentStore.loading" class="loading-msg">Učitavam...</div>
        <div v-else-if="paymentStore.error" class="error-message">{{ paymentStore.error }}</div>
        <div v-else-if="paymentStore.payments.length === 0" class="empty-msg">Nema plaćanja.</div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Primalac</th>
              <th>Iznos</th>
              <th>Svrha</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in paymentStore.payments"
              :key="p.id"
              class="payment-row clickable-row"
              @click="openDetail(p)"
            >
              <td>{{ new Date(p.vremeTransakcije).toLocaleDateString('sr-RS') }}</td>
              <td>{{ p.racunPrimaocaBroj }}</td>
              <td>{{ p.iznos.toLocaleString('sr-RS') }}</td>
              <td>{{ p.svrha }}</td>
              <td><span :class="['badge', statusBadgeClass(p.status)]">{{ p.status }}</span></td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div v-if="paymentStore.total > paymentStore.pageSize" class="pagination">
          <button class="btn btn-secondary" :disabled="paymentStore.page <= 1" @click="prevPage">‹</button>
          <span>{{ paymentStore.page }} / {{ totalPages }}</span>
          <button class="btn btn-secondary" :disabled="paymentStore.page >= totalPages" @click="nextPage">›</button>
        </div>

      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="selectedPayment" class="modal-overlay" @click.self="closeDetail">
      <div class="modal-box">
        <div class="modal-header">
          <h2>Detalji plaćanja</h2>
          <button class="modal-close" @click="closeDetail">✕</button>
        </div>
        <div class="modal-body">
          <table class="detail-table">
            <tbody>
              <tr>
                <th>ID</th>
                <td>{{ selectedPayment.id }}</td>
              </tr>
              <tr>
                <th>Sa računa</th>
                <td>{{ selectedPayment.racunPosiljaocaId }}</td>
              </tr>
              <tr>
                <th>Primalac (broj računa)</th>
                <td>{{ selectedPayment.racunPrimaocaBroj }}</td>
              </tr>
              <tr>
                <th>Iznos</th>
                <td>{{ selectedPayment.iznos.toLocaleString('sr-RS') }}</td>
              </tr>
              <tr>
                <th>Šifra plaćanja</th>
                <td>{{ selectedPayment.sifraPlacanja }}</td>
              </tr>
              <tr>
                <th>Poziv na broj</th>
                <td>{{ selectedPayment.pozivNaBroj || '—' }}</td>
              </tr>
              <tr>
                <th>Svrha</th>
                <td>{{ selectedPayment.svrha }}</td>
              </tr>
              <tr>
                <th>Status</th>
                <td>
                  <span :class="['badge', statusBadgeClass(selectedPayment.status)]">
                    {{ selectedPayment.status }}
                  </span>
                </td>
              </tr>
              <tr>
                <th>Datum</th>
                <td>{{ new Date(selectedPayment.vremeTransakcije).toLocaleString('sr-RS') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeDetail">Zatvori</button>
        </div>
      </div>
    </div>

  </div>
</template>

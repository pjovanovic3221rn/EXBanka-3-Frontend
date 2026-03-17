<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useClientAuthStore } from '../../stores/clientAuth'
import { useClientAccountStore } from '../../stores/clientAccount'
import { useRecipientStore } from '../../stores/recipient'
import { usePaymentStore } from '../../stores/payment'
import { SIFRE_PLACANJA } from '../../api/payment'
import type { PaymentItem } from '../../api/payment'

const router = useRouter()
const clientAuthStore = useClientAuthStore()
const accountStore = useClientAccountStore()
const recipientStore = useRecipientStore()
const paymentStore = usePaymentStore()

const clientId = computed(() => String(clientAuthStore.client?.id ?? ''))

// 4-step flow: form → confirm → verify → success
const step = ref<'form' | 'confirm' | 'verify' | 'success'>('form')

const form = ref({
  fromAccountId: '',
  recipientMode: 'saved' as 'saved' | 'manual',
  savedRecipientId: '',
  manualBrojRacuna: '',
  iznos: '',
  sifraPlacanja: '289',
  pozivNaBroj: '',
  svrha: '',
})

const createdPayment = ref<PaymentItem | null>(null)
const verificationCode = ref('')
const verifyError = ref('')
const formError = ref('')

const receiverBrojRacuna = computed(() => {
  if (form.value.recipientMode === 'saved') {
    const r = recipientStore.recipients.find(r => r.id === form.value.savedRecipientId)
    return r?.brojRacuna ?? ''
  }
  return form.value.manualBrojRacuna
})

const fromAccount = computed(() =>
  accountStore.accounts.find(a => String(a.id) === form.value.fromAccountId) ?? null
)

const selectedSifra = computed(() =>
  SIFRE_PLACANJA.find(s => s.sifra === form.value.sifraPlacanja)
)

function fillFromRecipient(recipientId: string) {
  form.value.savedRecipientId = recipientId
}

function goToConfirm() {
  formError.value = ''
  if (!form.value.fromAccountId) { formError.value = 'Izaberite izvorni račun.'; return }
  if (!receiverBrojRacuna.value) { formError.value = 'Unesite broj računa primaoca.'; return }
  if (!form.value.iznos || Number(form.value.iznos) <= 0) { formError.value = 'Unesite validan iznos.'; return }
  if (!form.value.svrha.trim()) { formError.value = 'Unesite svrhu plaćanja.'; return }
  step.value = 'confirm'
}

async function handleSubmit() {
  try {
    const payment = await paymentStore.createPayment({
      racunPosiljaocaId: Number(form.value.fromAccountId),
      racunPrimaocaBroj: receiverBrojRacuna.value,
      iznos: Number(form.value.iznos),
      sifraPlacanja: form.value.sifraPlacanja,
      pozivNaBroj: form.value.pozivNaBroj,
      svrha: form.value.svrha,
      recipientId: form.value.recipientMode === 'saved' && form.value.savedRecipientId
        ? Number(form.value.savedRecipientId)
        : undefined,
    })
    createdPayment.value = payment
    step.value = 'verify'
  } catch (e: any) {
    formError.value = e.response?.data?.message || 'Greška pri kreiranju plaćanja.'
    step.value = 'form'
  }
}

async function handleVerify() {
  if (!verificationCode.value || verificationCode.value.length !== 6) {
    verifyError.value = 'Unesite 6-cifreni verifikacioni kod.'
    return
  }
  verifyError.value = ''
  try {
    await paymentStore.verifyPayment(createdPayment.value!.id, verificationCode.value)
    step.value = 'success'
  } catch (e: any) {
    verifyError.value = e.response?.data?.message || 'Neispravan verifikacioni kod.'
  }
}

function startNew() {
  form.value = {
    fromAccountId: '', recipientMode: 'saved', savedRecipientId: '',
    manualBrojRacuna: '', iznos: '', sifraPlacanja: '289', pozivNaBroj: '', svrha: '',
  }
  verificationCode.value = ''
  verifyError.value = ''
  formError.value = ''
  createdPayment.value = null
  step.value = 'form'
}

onMounted(async () => {
  if (clientId.value) {
    await Promise.all([
      accountStore.fetchAccounts(clientId.value),
      recipientStore.fetchRecipients(clientId.value),
    ])
  }
})
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Novo plaćanje</h1>

    <div class="card">
      <div class="card-body">

        <!-- Step: Form -->
        <div v-if="step === 'form'">
          <div class="form-group">
            <label>Sa računa</label>
            <select v-model="form.fromAccountId" class="form-input">
              <option value="">-- Izaberite račun --</option>
              <option v-for="acc in accountStore.accounts" :key="acc.id" :value="String(acc.id)">
                {{ acc.naziv || acc.brojRacuna }} ({{ acc.currencyKod }}) — {{ acc.raspolozivoStanje.toLocaleString('sr-RS') }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Način unosa primaoca</label>
            <div class="radio-group">
              <label>
                <input v-model="form.recipientMode" type="radio" value="saved" />
                Sačuvani primalac
              </label>
              <label>
                <input v-model="form.recipientMode" type="radio" value="manual" />
                Ručni unos
              </label>
            </div>
          </div>

          <div v-if="form.recipientMode === 'saved'" class="form-group">
            <label>Primalac</label>
            <select v-model="form.savedRecipientId" class="form-input" @change="fillFromRecipient(form.savedRecipientId)">
              <option value="">-- Izaberite primaoca --</option>
              <option v-for="r in recipientStore.recipients" :key="r.id" :value="r.id">
                {{ r.naziv }} — {{ r.brojRacuna }}
              </option>
            </select>
          </div>

          <div v-else class="form-group">
            <label>Broj računa primaoca</label>
            <input v-model="form.manualBrojRacuna" type="text" class="form-input" placeholder="Broj računa primaoca" />
          </div>

          <div class="form-group">
            <label>Iznos</label>
            <input v-model="form.iznos" type="number" min="0.01" step="0.01" class="form-input" placeholder="0.00" />
          </div>

          <div class="form-group">
            <label>Šifra plaćanja</label>
            <select v-model="form.sifraPlacanja" class="form-input">
              <option v-for="s in SIFRE_PLACANJA" :key="s.sifra" :value="s.sifra">
                {{ s.sifra }} — {{ s.naziv }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Poziv na broj</label>
            <input v-model="form.pozivNaBroj" type="text" class="form-input" placeholder="Poziv na broj" />
          </div>

          <div class="form-group">
            <label>Svrha plaćanja</label>
            <input v-model="form.svrha" type="text" class="form-input" placeholder="Svrha plaćanja" />
          </div>

          <div v-if="formError" class="error-message">{{ formError }}</div>

          <button class="btn btn-primary" @click="goToConfirm">Dalje</button>
        </div>

        <!-- Step: Confirm -->
        <div v-else-if="step === 'confirm'">
          <h3>Pregled plaćanja</h3>
          <table class="detail-table">
            <tbody>
              <tr>
                <th>Sa računa</th>
                <td>{{ fromAccount?.naziv || fromAccount?.brojRacuna }} ({{ fromAccount?.currencyKod }})</td>
              </tr>
              <tr>
                <th>Primalac</th>
                <td>{{ receiverBrojRacuna }}</td>
              </tr>
              <tr>
                <th>Iznos</th>
                <td>{{ Number(form.iznos).toLocaleString('sr-RS') }} {{ fromAccount?.currencyKod }}</td>
              </tr>
              <tr>
                <th>Šifra plaćanja</th>
                <td>{{ form.sifraPlacanja }} — {{ selectedSifra?.naziv }}</td>
              </tr>
              <tr>
                <th>Poziv na broj</th>
                <td>{{ form.pozivNaBroj || '—' }}</td>
              </tr>
              <tr>
                <th>Svrha</th>
                <td>{{ form.svrha }}</td>
              </tr>
            </tbody>
          </table>

          <div v-if="formError" class="error-message">{{ formError }}</div>

          <div class="action-row">
            <button class="btn btn-secondary" @click="step = 'form'">Nazad</button>
            <button class="btn btn-primary" :disabled="paymentStore.loading" @click="handleSubmit">
              {{ paymentStore.loading ? 'Šaljem...' : 'Potvrdi' }}
            </button>
          </div>
        </div>

        <!-- Step: Verify -->
        <div v-else-if="step === 'verify'">
          <h3>Verifikacija plaćanja</h3>
          <p class="text-muted">Unesite 6-cifreni verifikacioni kod koji ste primili.</p>

          <div class="form-group">
            <label>Verifikacioni kod</label>
            <input
              v-model="verificationCode"
              type="text"
              maxlength="6"
              class="form-input"
              placeholder="------"
            />
          </div>

          <div v-if="verifyError" class="error-message">{{ verifyError }}</div>

          <div class="action-row">
            <button class="btn btn-secondary" @click="step = 'confirm'">Nazad</button>
            <button
              class="btn btn-primary"
              :disabled="verificationCode.length !== 6"
              @click="handleVerify"
            >
              Potvrdi kod
            </button>
          </div>
        </div>

        <!-- Step: Success -->
        <div v-else-if="step === 'success'" class="success-box">
          <div class="success-icon">✓</div>
          <p>Plaćanje je uspešno realizovano!</p>
          <div class="action-row">
            <button class="btn btn-secondary" @click="router.push('/client/payments')">Pregled plaćanja</button>
            <button class="btn btn-primary" @click="startNew">Novo plaćanje</button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

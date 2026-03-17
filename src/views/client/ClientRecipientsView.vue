<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRecipientStore } from '../../stores/recipient'
import { useClientAuthStore } from '../../stores/clientAuth'
import type { RecipientItem } from '../../api/recipient'

const clientAuthStore = useClientAuthStore()
const store = useRecipientStore()

const clientId = computed(() => String(clientAuthStore.client?.id ?? ''))

// Modal state
const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ naziv: '', brojRacuna: '' })
const formError = ref('')
const formLoading = ref(false)

// Delete confirm state
const deletingId = ref<string | null>(null)
const deleteLoading = ref(false)

function openAdd() {
  editingId.value = null
  form.value = { naziv: '', brojRacuna: '' }
  formError.value = ''
  modalOpen.value = true
}

function openEdit(r: RecipientItem) {
  editingId.value = r.id
  form.value = { naziv: r.naziv, brojRacuna: r.brojRacuna }
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function handleSave() {
  if (!form.value.naziv.trim() || !form.value.brojRacuna.trim()) {
    formError.value = 'Naziv i broj računa su obavezni.'
    return
  }
  formLoading.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await store.updateRecipient(editingId.value, form.value.naziv, form.value.brojRacuna)
    } else {
      await store.createRecipient(clientId.value, form.value.naziv, form.value.brojRacuna)
    }
    modalOpen.value = false
  } catch (e: any) {
    formError.value = e.response?.data?.message || 'Greška pri čuvanju.'
  } finally {
    formLoading.value = false
  }
}

function confirmDelete(id: string) {
  deletingId.value = id
}

function cancelDelete() {
  deletingId.value = null
}

async function handleDelete() {
  if (!deletingId.value) return
  deleteLoading.value = true
  try {
    await store.deleteRecipient(deletingId.value)
    deletingId.value = null
  } catch (e: any) {
    store.error = e.response?.data?.message || 'Greška pri brisanju.'
    deletingId.value = null
  } finally {
    deleteLoading.value = false
  }
}

onMounted(async () => {
  if (clientId.value) await store.fetchRecipients(clientId.value)
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Primaoci plaćanja</h1>
      <button class="btn btn-primary" @click="openAdd">+ Dodaj primaoca</button>
    </div>

    <div class="card">
      <div class="card-body">
        <div v-if="store.loading" class="loading-msg">Učitavam...</div>
        <div v-else-if="store.error" class="error-message">{{ store.error }}</div>
        <div v-else-if="store.recipients.length === 0" class="empty-msg">Nema sačuvanih primalaca.</div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Naziv</th>
              <th>Broj računa</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in store.recipients" :key="r.id" class="recipient-row">
              <td>{{ r.naziv }}</td>
              <td>{{ r.brojRacuna }}</td>
              <td class="action-cell">
                <button class="btn btn-secondary btn-sm" @click="openEdit(r)">Izmeni</button>
                <button class="btn btn-danger btn-sm" @click="confirmDelete(r.id)">Obriši</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add / Edit Modal -->
    <div v-if="modalOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal-box">
        <div class="modal-header">
          <h2>{{ editingId ? 'Izmeni primaoca' : 'Novi primalac' }}</h2>
          <button class="modal-close" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Naziv primaoca</label>
            <input v-model="form.naziv" type="text" class="form-input" placeholder="Naziv primaoca" />
          </div>
          <div class="form-group">
            <label>Broj računa</label>
            <input v-model="form.brojRacuna" type="text" class="form-input" placeholder="Broj računa" />
          </div>
          <div v-if="formError" class="error-message">{{ formError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Otkaži</button>
          <button class="btn btn-primary" :disabled="formLoading" @click="handleSave">
            {{ formLoading ? 'Čuvam...' : 'Sačuvaj' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm Modal -->
    <div v-if="deletingId" class="modal-overlay" @click.self="cancelDelete">
      <div class="modal-box">
        <div class="modal-header">
          <h2>Potvrda brisanja</h2>
          <button class="modal-close" @click="cancelDelete">✕</button>
        </div>
        <div class="modal-body">
          <p>Da li ste sigurni da želite da obrišete ovog primaoca?</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="cancelDelete">Otkaži</button>
          <button class="btn btn-danger" :disabled="deleteLoading" @click="handleDelete">
            {{ deleteLoading ? 'Brišem...' : 'Obriši' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import '../app.css';
  import { MODELS } from '$lib/models.js';
  import type { ModelConfig } from '$lib/types.js';

  let prompt = $state('');
  let selectedModelId = $state(MODELS[0].id);
  let selectedAspectRatio = $state(MODELS[0].aspectRatios[0]);
  let count = $state(1);
  let enhance = $state(false);
  let resolution = $state('1K');
  const resolutionOptions = ['1K', '2K', '4K'];

  let referenceImageUrl = $state('');
  let referenceImageName = $state('');
  let uploadStatus = $state<'idle' | 'uploading' | 'done' | 'error'>('idle');
  let uploadError = $state('');
  let fileInput = $state<HTMLInputElement | null>(null);

  let uiStatus = $state<'idle' | 'generating' | 'done' | 'error'>('idle');
  let imageUrls = $state<string[]>([]);
  let errorMessage = $state('');
  let progress = $state(0);
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const selectedModel = $derived(MODELS.find(m => m.id === selectedModelId) as ModelConfig);

  $effect(() => {
    if (!selectedModel.aspectRatios.includes(selectedAspectRatio)) {
      selectedAspectRatio = selectedModel.aspectRatios[0];
    }
    if (count > selectedModel.maxImages) count = selectedModel.maxImages;
    if (!selectedModel.supportsResolution) resolution = '1K';
    if (!selectedModel.supportsReferenceImage) {
      referenceImageUrl = '';
      referenceImageName = '';
      uploadStatus = 'idle';
      uploadError = '';
    }
  });

  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    referenceImageName = file.name;
    uploadStatus = 'uploading';
    uploadError = '';
    referenceImageUrl = '';

    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (!res || !res.ok) {
      const errText = res ? await res.text().catch(() => '') : 'no response';
      uploadStatus = 'error';
      uploadError = `Upload fehlgeschlagen (${res?.status ?? 'network'}: ${errText.slice(0, 80)})`;
      (event.target as HTMLInputElement).value = '';
      return;
    }

    const data = await res.json().catch(() => null);
    if (!data?.url) {
      uploadStatus = 'error';
      uploadError = 'Upload fehlgeschlagen – kein URL in Antwort';
      (event.target as HTMLInputElement).value = '';
      return;
    }
    referenceImageUrl = data.url;
    uploadStatus = 'done';
    (event.target as HTMLInputElement).value = '';
  }

  function clearReferenceImage() {
    referenceImageUrl = '';
    referenceImageName = '';
    uploadStatus = 'idle';
    uploadError = '';
    if (fileInput) fileInput.value = '';
  }

  async function generate() {
    if (!prompt.trim() || uiStatus === 'generating') return;
    if (uploadStatus === 'uploading') return;

    uiStatus = 'generating';
    imageUrls = [];
    errorMessage = '';
    progress = 0;

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        modelId: selectedModelId,
        aspectRatio: selectedAspectRatio,
        count,
        enhance,
        resolution,
        referenceImageUrl: referenceImageUrl || undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Generierung fehlgeschlagen' }));
      uiStatus = 'error';
      errorMessage = body.message ?? 'Unbekannter Fehler';
      return;
    }

    const { taskId, modelId } = await res.json();
    startPolling(taskId, modelId);
  }

  function startPolling(taskId: string, modelId: string) {
    pollTimer = setInterval(async () => {
      const res = await fetch(`/api/status/${taskId}?modelId=${modelId}`);

      if (!res.ok) {
        stopPolling();
        uiStatus = 'error';
        errorMessage = 'Statusabfrage fehlgeschlagen';
        return;
      }

      const data = await res.json();
      if (data.progress) progress = Math.round(parseFloat(data.progress) * 100);

      if (data.status === 'done') {
        stopPolling();
        imageUrls = data.imageUrls ?? [];
        uiStatus = 'done';
      } else if (data.status === 'error') {
        stopPolling();
        uiStatus = 'error';
        errorMessage = data.error ?? 'Generierung fehlgeschlagen';
      }
    }, 10000);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  const countOptions = $derived(
    Array.from({ length: selectedModel.maxImages }, (_, i) => i + 1)
  );

  const generateDisabled = $derived(
    uiStatus === 'generating' || !prompt.trim() || uploadStatus === 'uploading'
  );
</script>

<main>
  <h1>Bildgenerierung</h1>

  <form onsubmit={(e) => { e.preventDefault(); generate(); }}>
    <label>
      Prompt
      <textarea
        bind:value={prompt}
        placeholder="Beschreibe dein Bild auf Deutsch oder Englisch…"
        rows="3"
        disabled={uiStatus === 'generating'}
      ></textarea>
    </label>

    {#if selectedModel.supportsReferenceImage}
      <div class="reference-image-section">
        <span class="reference-label">Referenzbild (optional)</span>

        {#if uploadStatus === 'idle'}
          <label class="file-upload-label">
            Datei auswählen
            <input
              type="file"
              accept="image/*"
              onchange={handleFileSelect}
              disabled={uiStatus === 'generating'}
              class="file-input-hidden"
              bind:this={fileInput}
            />
          </label>
        {/if}

        {#if uploadStatus === 'uploading'}
          <span class="upload-hint">Wird hochgeladen…</span>
        {/if}

        {#if uploadStatus === 'done'}
          <div class="reference-preview">
            <img src={referenceImageUrl} alt="Referenzbild" class="reference-thumbnail" />
            <span class="reference-filename">{referenceImageName}</span>
            <button type="button" onclick={clearReferenceImage} class="clear-btn">×</button>
          </div>
        {/if}

        {#if uploadStatus === 'error'}
          <span class="upload-error">{uploadError}</span>
          <label class="file-upload-label">
            Erneut versuchen
            <input
              type="file"
              accept="image/*"
              onchange={handleFileSelect}
              class="file-input-hidden"
            />
          </label>
        {/if}

        <p class="upload-hint">Das Referenzbild wird temporär auf einem öffentlichen Server gehostet.</p>
      </div>
    {/if}

    <div class="controls">
      <label>
        Modell
        <select bind:value={selectedModelId} disabled={uiStatus === 'generating'}>
          {#each MODELS as model (model.id)}
            <option value={model.id}>{model.label}</option>
          {/each}
        </select>
      </label>

      <label>
        Seitenverhältnis
        <select bind:value={selectedAspectRatio} disabled={uiStatus === 'generating'}>
          {#each selectedModel.aspectRatios as ratio (ratio)}
            <option value={ratio}>{ratio}</option>
          {/each}
        </select>
      </label>

      <label>
        Anzahl Bilder
        <select bind:value={count} disabled={uiStatus === 'generating'}>
          {#each countOptions as n (n)}
            <option value={n}>{n}</option>
          {/each}
        </select>
      </label>

      {#if selectedModel.supportsResolution}
        <label>
          Auflösung
          <select bind:value={resolution} disabled={uiStatus === 'generating'}>
            {#each resolutionOptions as res (res)}
              <option value={res}>{res}</option>
            {/each}
          </select>
        </label>
      {/if}

      {#if selectedModel.supportsEnhance}
        <label class="checkbox">
          <input type="checkbox" bind:checked={enhance} disabled={uiStatus === 'generating'} />
          Prompt automatisch verbessern
        </label>
      {/if}
    </div>

    <button type="submit" disabled={generateDisabled}>
      {uiStatus === 'generating' ? 'Wird generiert…' : uploadStatus === 'uploading' ? 'Bild wird hochgeladen…' : 'Generieren'}
    </button>
  </form>

  {#if uiStatus === 'generating'}
    <div class="status">
      <p>Generierung läuft… {progress > 0 ? `${progress}%` : 'warte auf Antwort'}</p>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {progress}%"></div>
      </div>
    </div>
  {/if}

  {#if uiStatus === 'error'}
    <div class="error-box">{errorMessage}</div>
  {/if}

  {#if imageUrls.length > 0}
    <div class="images">
      {#each imageUrls as url, i (url)}
        <div class="image-card">
          <img src={url} alt="Generiertes Bild {i + 1}" />
          <a href={url} target="_blank" rel="noopener noreferrer">Herunterladen</a>
        </div>
      {/each}
    </div>
  {/if}
</main>

<style>
  .reference-image-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .reference-label {
    font-weight: 500;
    font-size: 0.9rem;
  }

  .file-upload-label {
    display: inline-block;
    padding: 0.4rem 0.8rem;
    background: #e5e7eb;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    width: fit-content;
  }

  .file-upload-label:hover {
    background: #d1d5db;
  }

  .file-input-hidden {
    display: none;
  }

  .reference-preview {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .reference-thumbnail {
    width: 48px;
    height: 48px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #d1d5db;
  }

  .reference-filename {
    font-size: 0.85rem;
    color: #6b7280;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .clear-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    color: #6b7280;
    padding: 0 0.25rem;
    line-height: 1;
  }

  .clear-btn:hover {
    color: #111;
  }

  .upload-hint {
    font-size: 0.75rem;
    color: #9ca3af;
    margin: 0;
  }

  .upload-error {
    font-size: 0.85rem;
    color: #dc2626;
  }
</style>

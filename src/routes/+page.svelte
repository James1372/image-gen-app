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
  });

  async function generate() {
    if (!prompt.trim() || uiStatus === 'generating') return;

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

    <button type="submit" disabled={uiStatus === 'generating' || !prompt.trim()}>
      {uiStatus === 'generating' ? 'Wird generiert…' : 'Generieren'}
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

const form = document.querySelector('#clip-form');
const button = document.querySelector('#submit');
const statusBox = document.querySelector('#status');

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  statusBox.hidden = false;
  statusBox.className = 'status working';
  statusBox.textContent = 'Preparando tu clip… La descarga y el recorte pueden tardar unos minutos.';
  button.disabled = true;
  button.querySelector('.button-label').textContent = 'Procesando…';
  try {
    const formData = new FormData(form);
    const response = await fetch('/api/clips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: formData.get('url'), start: formData.get('start'), duration: Number(formData.get('duration')) })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo crear el clip.');
    statusBox.className = 'status success';
    statusBox.innerHTML = `¡Tu clip está listo! <a href="${result.downloadUrl}">Descargar MP4</a><small>Guardado en: ${escapeHtml(result.path)}</small>`;
  } catch (error) {
    statusBox.className = 'status error';
    statusBox.textContent = error.message;
  } finally {
    button.disabled = false;
    button.querySelector('.button-label').textContent = 'Crear clip vertical';
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

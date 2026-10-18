import { $ } from '../lib/util.js';

// Placeholder number: replace with the studio's WhatsApp number in international format.
const WHATSAPP = '6281234567890';

export function initContact() {
  const form = $('#form-konsultasi');
  if (!form) return;
  const status = $('.form__status', form);

  const fields = {
    nama: { el: form.elements.nama, msg: 'Tulis nama Anda.' },
    jenis: { el: form.elements.jenis, msg: 'Pilih jenis proyek.' },
  };

  function check(name) {
    const { el, msg } = fields[name];
    const value = el instanceof RadioNodeList ? el.value : el.value.trim();
    const error = $(`#err-${name}`, form);
    const target = el instanceof RadioNodeList ? el[0].closest('fieldset') : el;
    target.setAttribute('aria-invalid', String(!value));
    error.textContent = value ? '' : msg;
    return Boolean(value);
  }

  form.addEventListener('change', (e) => {
    const name = e.target.name;
    if (fields[name] && $(`#err-${name}`, form).textContent) check(name);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = Object.keys(fields).map(check).every(Boolean);
    if (!ok) {
      const first = Object.values(fields).find(({ el }) => {
        const target = el instanceof RadioNodeList ? el[0].closest('fieldset') : el;
        return target.getAttribute('aria-invalid') === 'true';
      });
      (first.el instanceof RadioNodeList ? first.el[0] : first.el).focus();
      status.textContent = 'Lengkapi isian yang ditandai.';
      return;
    }
    const d = new FormData(form);
    const lines = [
      `Halo, saya ${d.get('nama')}.`,
      `Jenis proyek: ${d.get('jenis')}`,
      d.get('luas') && `Perkiraan luas: ${d.get('luas')} m²`,
      d.get('lokasi') && `Lokasi: ${d.get('lokasi')}`,
      d.get('anggaran') && `Anggaran: ${d.get('anggaran')}`,
      d.get('pesan') && `\n${d.get('pesan')}`,
    ].filter(Boolean);
    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener');
    status.textContent = 'WhatsApp terbuka di tab baru. Kami biasanya membalas dalam satu hari kerja.';
  });
}

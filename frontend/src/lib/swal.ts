import Swal from 'sweetalert2';

const BLUE = '#2563eb';
const GRAY = '#6b7280';
const RED = '#dc2626';
const GREEN = '#16a34a';

/** Toast kecil di pojok kanan atas. */
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true,
  customClass: { popup: 'rounded-xl text-sm' },
});

export function toastSuccess(title: string) {
  return Toast.fire({ icon: 'success', title });
}

export function toastError(title: string) {
  return Toast.fire({ icon: 'error', title, timer: 3600 });
}

export function toastInfo(title: string) {
  return Toast.fire({ icon: 'info', title });
}

export function alertError(message: string, title = 'Terjadi kesalahan') {
  return Swal.fire({
    icon: 'error',
    title,
    text: message,
    confirmButtonColor: BLUE,
    confirmButtonText: 'Mengerti',
  });
}

/** Dialog konfirmasi ya/tidak. Mengembalikan true bila pengguna menyetujui. */
export async function confirmAction(opts: {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  icon?: 'warning' | 'question' | 'info';
}): Promise<boolean> {
  const res = await Swal.fire({
    icon: opts.icon ?? (opts.danger ? 'warning' : 'question'),
    title: opts.title,
    text: opts.text,
    showCancelButton: true,
    confirmButtonText: opts.confirmText ?? 'Ya, lanjutkan',
    cancelButtonText: opts.cancelText ?? 'Batal',
    confirmButtonColor: opts.danger ? RED : BLUE,
    cancelButtonColor: GRAY,
    reverseButtons: true,
    focusCancel: opts.danger,
  });
  return res.isConfirmed;
}

/** Minta alasan / catatan lewat textarea. Mengembalikan teks, atau null bila dibatalkan. */
export async function promptReason(opts: {
  title: string;
  inputLabel?: string;
  placeholder?: string;
  confirmText?: string;
  required?: boolean;
  danger?: boolean;
}): Promise<string | null> {
  const res = await Swal.fire({
    title: opts.title,
    input: 'textarea',
    inputLabel: opts.inputLabel,
    inputPlaceholder: opts.placeholder ?? 'Tulis di sini…',
    inputAttributes: { 'aria-label': opts.inputLabel ?? 'Catatan' },
    showCancelButton: true,
    confirmButtonText: opts.confirmText ?? 'Kirim',
    cancelButtonText: 'Batal',
    confirmButtonColor: opts.danger ? RED : GREEN,
    cancelButtonColor: GRAY,
    reverseButtons: true,
    inputValidator: (value) => {
      if (opts.required && !value.trim()) return 'Bagian ini wajib diisi.';
      return null;
    },
  });
  if (!res.isConfirmed) return null;
  return (res.value ?? '').trim();
}

/** Bungkus aksi async: tampilkan loading, lalu toast sukses / error otomatis. */
export async function runWithFeedback<T>(
  fn: () => Promise<T>,
  opts: { success?: string; loading?: string } = {},
): Promise<T | undefined> {
  Swal.fire({
    title: opts.loading ?? 'Memproses…',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  try {
    const result = await fn();
    Swal.close();
    if (opts.success) await toastSuccess(opts.success);
    return result;
  } catch (err: any) {
    Swal.close();
    await alertError(err?.message ?? 'Gagal memproses permintaan.');
    return undefined;
  }
}

'use client';

import { Toaster } from 'sonner';

export function ToasterProvider() {
  return (
    <Toaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        className: '!bg-slate-900 !border-slate-700 !text-slate-100',
      }}
      richColors
      closeButton
    />
  );
}

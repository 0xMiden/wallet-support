import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useDropzone } from 'react-dropzone';
import { AnimatePresence, motion } from 'framer-motion';
import { ImagePlus, Trash2, Expand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePreset } from '@/lib/animation';
import { cn } from '@/lib/utils';

export const MAX_MEDIA_FILES = 3;
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'video/mp4'];

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function MediaPreview({ file }: { file: File }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  if (!url) return <div className="aspect-video rounded-lg bg-secondary" />;
  if (file.type === 'video/mp4') {
    return <video src={url} controls preload="metadata" playsInline aria-label={`Preview of ${file.name}`} className="aspect-video w-full rounded-lg bg-secondary object-contain" />;
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="group relative block w-full overflow-hidden rounded-lg bg-secondary" aria-label={`View ${file.name}`}>
          <img src={url} alt={`Preview of ${file.name}`} className="aspect-video w-full object-contain" />
          <span className="absolute right-2 top-2 rounded-full bg-background p-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Expand className="size-4" aria-hidden="true" />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogTitle className="break-all pr-10">{file.name}</DialogTitle>
        <DialogDescription>Check your screenshot before sharing it with the team.</DialogDescription>
        <img src={url} alt={file.name} className="max-h-[65dvh] w-full object-contain" />
      </DialogContent>
    </Dialog>
  );
}

export function MediaUploader({ files, onChange, formRef, disabled = false }: {
  files: File[];
  formRef: RefObject<HTMLFormElement>;
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const [error, setError] = useState('');
  const chooseButton = useRef<HTMLButtonElement>(null);
  const fileIds = useRef(new WeakMap<File, string>());
  const fileKey = (file: File) => {
    const existing = fileIds.current.get(file);
    if (existing) return existing;
    const id = crypto.randomUUID();
    fileIds.current.set(file, id);
    return id;
  };
  const pop = usePreset('pop');
  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  const addFiles = (incoming: File[]) => {
    if (disabled || incoming.length === 0) return;
    if (incoming.some(file => !ACCEPTED_TYPES.includes(file.type))) {
      setError('Choose PNG, JPEG, or MP4 files.');
      return;
    }
    if (files.length + incoming.length > MAX_MEDIA_FILES) {
      setError('You can attach up to 3 files. Remove a file before adding more.');
      return;
    }
    if (incoming.some(file => file.size === 0)) {
      setError('This file is empty. Choose another file.');
      return;
    }
    if (totalBytes + incoming.reduce((total, file) => total + file.size, 0) > MAX_MEDIA_BYTES) {
      setError('Keep all attachments under 10 MB in total. Choose a smaller file or a shorter video.');
      return;
    }
    setError('');
    onChange([...files, ...incoming]);
  };
  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'video/mp4': ['.mp4'] },
    disabled,
    multiple: true,
    noClick: true,
    noKeyboard: true,
    noPaste: true,
    onDrop: (accepted, rejected) => {
      if (rejected.length) setError('Choose PNG, JPEG, or MP4 files.');
      else addFiles(accepted);
    }
  });
  useEffect(() => {
    const form = formRef.current;
    const paste = (event: ClipboardEvent) => {
      if (!event.clipboardData?.files.length || disabled) return;
      event.preventDefault();
      addFiles(Array.from(event.clipboardData.files));
    };
    form?.addEventListener('paste', paste);
    return () => form?.removeEventListener('paste', paste);
  }, [formRef, files, disabled, onChange]);

  return (
    <div role="group" aria-label="Screenshots and videos" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="type-label">Screenshots and videos <span className="font-normal text-muted-foreground">(optional)</span></p>
        <span className="type-caption shrink-0 text-muted-foreground">{files.length} / {MAX_MEDIA_FILES}</span>
      </div>
      <div {...getRootProps({ className: cn('rounded-xl border border-dashed p-5 text-center transition-colors', isDragActive ? 'border-ring bg-accent' : 'border-input bg-secondary/30') })}>
        <input {...getInputProps({ id: 'feedback-attachment', 'aria-label': 'Attach screenshots or videos', 'aria-describedby': 'attachment-hint' })} />
        <ImagePlus className="mx-auto mb-3 size-6 text-muted-foreground" aria-hidden="true" />
        <p className="type-title mb-1">{isDragActive ? 'Drop your files here' : 'Show us what happened'}</p>
        <p className="mb-4 text-sm text-muted-foreground">Drag files here, or paste a screenshot.</p>
        <Button ref={chooseButton} type="button" variant="secondary" onClick={open} disabled={disabled}>Choose files</Button>
        <p id="attachment-hint" className="type-caption mt-3 text-muted-foreground">PNG, JPEG, or MP4 · up to 3 files · 10 MB total</p>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <ul className="grid gap-3 sm:grid-cols-2" aria-label="Selected attachments">
        <AnimatePresence initial={false}>
          {files.map((file, index) => (
            <motion.li key={fileKey(file)} {...pop} className="min-w-0 rounded-xl border p-2">
              <MediaPreview file={file} />
              <div className="flex items-center gap-2 pl-1 pt-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={file.name}>{file.name}</p>
                  <p className="type-caption text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${file.name}`} disabled={disabled} onClick={() => {
                  setError('');
                  onChange(files.filter((_, fileIndex) => fileIndex !== index));
                  chooseButton.current?.focus();
                }}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <p className="type-caption text-muted-foreground">
        Attachments may appear in a public GitHub issue. Remove personal information before sending.
      </p>
    </div>
  );
}

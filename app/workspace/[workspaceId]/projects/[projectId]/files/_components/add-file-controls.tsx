"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Link2, Paperclip } from "lucide-react";
import Button from "@/components/button";
import Input from "@/components/input";
import Popup from "@/components/popup";
import { cn } from "@/lib/cn";
import {
  addProjectResourceLink,
  uploadProjectFile,
  type FileActionState,
} from "../actions";

const labelClass = "text-[12px] font-medium text-zinc-700 dark:text-zinc-300";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function AddFileControls({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => setUploadOpen(true)}
        >
          <FileUp className="h-3.5 w-3.5" />
          Upload file
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setLinkOpen(true)}
        >
          <Link2 className="h-3.5 w-3.5" />
          Add link
        </Button>
      </div>

      <UploadPopup
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        workspaceId={workspaceId}
        projectId={projectId}
      />
      <LinkPopup
        open={linkOpen}
        onOpenChange={setLinkOpen}
        workspaceId={workspaceId}
        projectId={projectId}
      />
    </>
  );
}

function UploadPopup({
  open,
  onOpenChange,
  workspaceId,
  projectId,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  workspaceId: string;
  projectId: string;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [state, setState] = useState<FileActionState>({});
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setName("");
    setState({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    if (pending) return;
    if (!next) reset();
    onOpenChange(next);
  }

  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await uploadProjectFile(
        workspaceId,
        projectId,
        state,
        formData,
      );
      if (result?.ok) {
        reset();
        onOpenChange(false);
        router.refresh();
      } else {
        setState(result);
      }
    });
  };

  return (
    <Popup
      open={open}
      onOpenChange={handleOpenChange}
      title="Upload a file"
      description="Add a document, image, or any file to this project."
      className="sm:max-w-lg"
    >
      <form action={handleAction} className="px-6 pb-6 pt-2">
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f && !name) setName(f.name);
            setState({});
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border border-dashed px-4 py-5 text-left transition-colors",
            state.errors?.file
              ? "border-red-400 dark:border-red-500"
              : "border-zinc-300 hover:border-primary/60 hover:bg-primary/[0.03] dark:border-zinc-700 dark:hover:border-primary/60",
          )}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <Paperclip className="h-4.5 w-4.5" />
          </span>
          {file ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                {file.name}
              </span>
              <span className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
                {formatBytes(file.size)} · click to change
              </span>
            </span>
          ) : (
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                Choose a file
              </span>
              <span className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
                Up to 4.5 MB
              </span>
            </span>
          )}
        </button>
        {state.errors?.file ? (
          <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
            {state.errors.file}
          </p>
        ) : null}

        <div className="mt-4">
          <label htmlFor="file-name" className={labelClass}>
            Display name
          </label>
          <Input
            id="file-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Defaults to the file name"
            maxLength={200}
            autoComplete="off"
            className="mt-2"
          />
        </div>

        {state.formError ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {state.formError}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={pending || !file}
            aria-busy={pending}
          >
            {pending ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </form>
    </Popup>
  );
}

function LinkPopup({
  open,
  onOpenChange,
  workspaceId,
  projectId,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  workspaceId: string;
  projectId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [state, setState] = useState<FileActionState>({});
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setUrl("");
    setState({});
  }

  function handleOpenChange(next: boolean) {
    if (pending) return;
    if (!next) reset();
    onOpenChange(next);
  }

  const handleAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await addProjectResourceLink(
        workspaceId,
        projectId,
        state,
        formData,
      );
      if (result?.ok) {
        reset();
        onOpenChange(false);
        router.refresh();
      } else {
        setState(result);
      }
    });
  };

  const errClass = (key: "name" | "url") =>
    state.errors?.[key]
      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500"
      : "";

  return (
    <Popup
      open={open}
      onOpenChange={handleOpenChange}
      title="Add a resource link"
      description="Link to a document, design, repo, or anything on the web."
      className="sm:max-w-lg"
    >
      <form action={handleAction} className="px-6 pb-6 pt-2">
        <div>
          <label htmlFor="link-name" className={labelClass}>
            Name *
          </label>
          <Input
            id="link-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Design spec, GitHub repo…"
            maxLength={200}
            autoComplete="off"
            className={cn("mt-2", errClass("name"))}
          />
          {state.errors?.name ? (
            <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
              {state.errors.name}
            </p>
          ) : null}
        </div>

        <div className="mt-4">
          <label htmlFor="link-url" className={labelClass}>
            URL *
          </label>
          <Input
            id="link-url"
            name="url"
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            autoComplete="off"
            className={cn("mt-2", errClass("url"))}
          />
          {state.errors?.url ? (
            <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
              {state.errors.url}
            </p>
          ) : null}
        </div>

        {state.formError ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {state.formError}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Adding…" : "Add link"}
          </Button>
        </div>
      </form>
    </Popup>
  );
}

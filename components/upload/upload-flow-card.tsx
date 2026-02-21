"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Loader2, UploadCloud } from "lucide-react";

import { ExportHelpDialog } from "@/components/upload/export-help-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type UploadState = "idle" | "uploading" | "success" | "error";

type UploadedFileMeta = {
  name: string;
  size: number;
  uploadedAt: Date;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
}

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

export function UploadFlowCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [fileMeta, setFileMeta] = useState<UploadedFileMeta | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const clearUploadTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetToIdle = () => {
    clearUploadTimer();
    setState("idle");
    setProgress(0);
    setErrorMessage("");
    setFileMeta(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const startMockUpload = (file: File) => {
    clearUploadTimer();
    setState("uploading");
    setProgress(0);
    setErrorMessage("");

    let current = 0;
    timerRef.current = setInterval(() => {
      current += 4;
      const next = Math.min(100, current);
      setProgress(next);

      if (next >= 100) {
        clearUploadTimer();
        setFileMeta({
          name: file.name,
          size: file.size,
          uploadedAt: new Date()
        });
        setState("success");
      }
    }, 100);
  };

  const handleSelectAndUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const isTxtFile = /\.txt$/i.test(file.name) || file.type === "text/plain";

    if (!isTxtFile) {
      clearUploadTimer();
      setState("error");
      setProgress(0);
      setErrorMessage("Please select a .txt WhatsApp export file.");
      return;
    }

    startMockUpload(file);
  };

  useEffect(() => {
    return () => clearUploadTimer();
  }, []);

  return (
    <>
      <Card className="w-full rounded-2xl border-border/80 shadow-card">
        <CardContent className="p-5 sm:p-6">
          <input
            ref={inputRef}
            type="file"
            accept=".txt,text/plain"
            onChange={handleSelectAndUpload}
            className="hidden"
          />

          {state === "idle" ? (
            <div className="space-y-4">
              <Button
                className="h-14 w-full rounded-xl text-base font-semibold active:scale-[0.985]"
                onClick={() => inputRef.current?.click()}
              >
                <UploadCloud className="mr-2 h-5 w-5" />
                Choose .txt and Upload
              </Button>

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">Only .txt exports supported</p>
                <Button variant="link" className="h-auto p-0 text-sm" onClick={() => setHelpOpen(true)}>
                  How to export?
                </Button>
              </div>
            </div>
          ) : null}

          {state === "uploading" ? (
            <div className="space-y-4 transition-all duration-200">
              <Button className="h-14 w-full rounded-xl text-base font-semibold" disabled>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Choose .txt and Upload
              </Button>

              <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </span>
                  <span className="font-medium text-foreground">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button variant="secondary" onClick={resetToIdle} className="h-10 rounded-lg">
                  Cancel
                </Button>
                <Button variant="link" className="h-auto p-0 text-sm" onClick={() => setHelpOpen(true)}>
                  How to export?
                </Button>
              </div>
            </div>
          ) : null}

          {state === "success" && fileMeta ? (
            <div className="space-y-4 text-center transition-all duration-200">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <div>
                <h3 className="text-lg font-semibold">Upload complete</h3>
                <p className="mt-1 text-sm text-muted-foreground">Your file is ready for the next step.</p>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/35 p-3 text-left text-sm">
                <p className="inline-flex items-center gap-2 font-medium text-foreground">
                  <FileText className="h-4 w-4" />
                  {fileMeta.name}
                </p>
                <p className="mt-1 text-muted-foreground">Size: {formatBytes(fileMeta.size)}</p>
                <p className="text-muted-foreground">Uploaded: {formatTimestamp(fileMeta.uploadedAt)}</p>
              </div>

              <Button
                className="h-14 w-full rounded-xl text-base font-semibold active:scale-[0.985]"
                onClick={() => {
                  resetToIdle();
                  inputRef.current?.click();
                }}
              >
                Upload another
              </Button>
            </div>
          ) : null}

          {state === "error" ? (
            <div className="space-y-4 transition-all duration-200">
              <Alert variant="destructive" className="border-destructive/35">
                <AlertTitle className="inline-flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Upload failed
                </AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>

              <Button className="h-12 w-full rounded-xl" onClick={resetToIdle}>
                Retry
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ExportHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}

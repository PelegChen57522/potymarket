"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

type ExportHelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ExportHelpDialog({ open, onOpenChange }: ExportHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How to export WhatsApp chat</DialogTitle>
          <DialogDescription>Use these quick steps before uploading your file.</DialogDescription>
        </DialogHeader>

        <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>1. Open the group chat in WhatsApp.</li>
          <li>2. Tap group info or menu, then choose <span className="font-medium text-foreground">Export chat</span>.</li>
          <li>3. Select <span className="font-medium text-foreground">Without media</span>.</li>
          <li>4. Save the export and upload the generated <span className="font-medium text-foreground">.txt</span> file here.</li>
        </ol>

        <DialogFooter>
          <DialogClose asChild>
            <Button>Got it</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";

import { ProfileImportCard } from "@/features/imports/components/profile-import-card";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ProfileImportDialogButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Nhập Excel
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-[1200px] overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>Nhập hồ sơ từ Excel</DialogTitle>
          </DialogHeader>

          <div className="max-h-[calc(92vh-72px)] overflow-y-auto px-5 py-4">
            <ProfileImportCard />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

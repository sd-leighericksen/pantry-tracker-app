"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "@phosphor-icons/react";

import type { CategoryOption, StoreOption, CreatedItem } from "@/lib/items";
import { analyzePhoto } from "@/app/items/actions";
import { ItemForm } from "@/components/ItemForm";

/* AI photo capture (BRIEF §5.2 path 4). Take/select a photo → downscale
 * client-side → server saves it and runs vision extraction → the manual form
 * opens PRE-FILLED for confirmation. Nothing is committed without the user. */

type Phase = "capture" | "analyzing" | "form";
const MAX_DIM = 1024;

export function CaptureView({
  categories,
  stores,
}: {
  categories: CategoryOption[];
  stores: StoreOption[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("capture");
  const [photo, setPhoto] = useState<string | null>(null);
  const [initial, setInitial] = useState<Parameters<typeof ItemForm>[0]["initial"]>({});
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPhase("analyzing");
    try {
      const dataUrl = await downscale(file);
      const res = await analyzePhoto(dataUrl);
      if (!res.ok) {
        setError(res.error);
        setPhase("capture");
        return;
      }
      setPhoto(res.photo);
      if (res.aiStatus === "ok" && res.extracted) {
        const hint = res.extracted.categoryHint?.toLowerCase();
        const matched = hint
          ? categories.find((c) => c.name.toLowerCase() === hint)
          : undefined;
        setInitial({
          name: res.extracted.name,
          brand: res.extracted.brand,
          categoryId: matched?.id,
          sizeText: res.extracted.sizeText,
          ingredients: res.extracted.ingredients,
          allergens: res.extracted.allergens,
          nutriments: res.extracted.nutriments,
        });
        setNote(null);
      } else {
        setNote(
          res.aiStatus === "not-configured"
            ? "AI is not configured — fill in the details below."
            : "Couldn't read the label — fill in the details below.",
        );
      }
      setPhase("form");
    } catch {
      setError("Could not read that image.");
      setPhase("capture");
    }
  }

  function onCreated(item: CreatedItem) {
    router.push(`/items/${item.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[40px] font-semibold leading-none tracking-tight text-ink">
          Add by photo
        </h1>
        <p className="mt-2 text-sm text-charcoal">
          Snap the front of pack or the label — we&rsquo;ll pre-fill what we can.
        </p>
      </header>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />

      {phase === "capture" && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline-strong bg-surface-card text-ink"
          >
            <Camera size={36} weight="light" />
            <span className="font-medium">Take or choose a photo</span>
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}

      {phase === "analyzing" && (
        <div className="flex min-h-[8rem] items-center justify-center rounded-xl border border-hairline-strong bg-surface-card text-charcoal">
          Reading the label…
        </div>
      )}

      {phase === "form" && (
        <>
          {note && (
            <p className="rounded-md border border-hairline-strong bg-surface-card px-4 py-3 text-sm text-charcoal">
              {note}
            </p>
          )}
          <ItemForm
            categories={categories}
            stores={stores}
            initial={initial}
            photo={photo}
            onCreated={onCreated}
            onCancel={() => {
              setPhase("capture");
              setPhoto(null);
              setInitial({});
            }}
          />
        </>
      )}
    </div>
  );
}

/** Downscale to <= MAX_DIM and re-encode JPEG so uploads/AI payloads stay small. */
function downscale(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}

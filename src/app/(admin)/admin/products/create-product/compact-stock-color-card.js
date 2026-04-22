import { Plus, X } from "lucide-react";

import { SHOP_OWNERS } from "@/app/(admin)/admin/shared/shop-owners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function parseCount(value) {
  return Number.parseInt(value || "0", 10) || 0;
}

function formatPieceLabel(value) {
  return `${value} piece${value > 1 ? "s" : ""}`;
}

const ownerDisplayOrder = ["Warda", "Hanane", "Amina"];

export function CompactStockColorCard({
  adminInputClass,
  color,
  commonSizeOptions,
  onAddSizeRow,
  onRemoveSizeRow,
  onSizeRowFieldChange,
  onSizeRowOwnerChange,
  ownerBadgeClassByName,
  sizeRows,
  validationHintText = "Le controle du stock se fera quand vous validerez le produit.",
}) {
  const activeSizeRows = sizeRows.filter(
    (sizeRow) =>
      sizeRow.size.trim() ||
      sizeRow.quantity !== "" ||
      ownerDisplayOrder.some((owner) => sizeRow.owners[owner] !== ""),
  );
  const colorQuantity = sizeRows.reduce(
    (sum, sizeRow) => sum + parseCount(sizeRow.quantity),
    0,
  );
  const colorAllocated = sizeRows.reduce(
    (sum, sizeRow) =>
      sum +
      SHOP_OWNERS.reduce(
        (ownerSum, owner) => ownerSum + parseCount(sizeRow.owners[owner]),
        0,
      ),
    0,
  );
  return (
    <div className="rounded-[24px] border border-slate-200 p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-[#081c16]">
              {color}
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
              {activeSizeRows.length} taille{activeSizeRows.length > 1 ? "s" : ""}
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
              {formatPieceLabel(colorQuantity)}
            </span>
            {ownerDisplayOrder.map((owner) => {
              const ownerTotal = sizeRows.reduce(
                (sum, sizeRow) => sum + parseCount(sizeRow.owners[owner]),
                0,
              );

              return (
                <span
                  key={`${color}-${owner}`}
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${ownerBadgeClassByName[owner]}`}>
                  {owner}: {ownerTotal}
                </span>
              );
            })}
          </div>

          <Button
            type="button"
            onClick={() => onAddSizeRow(color)}
            className="h-10 rounded-xl bg-[#081c16] px-4 text-sm font-semibold text-white hover:bg-[#081c16]/90">
            <Plus size={16} />
            Ligne vide
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Tailles rapides
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {commonSizeOptions.map((sizeOption) => (
              <button
                key={`${color}-${sizeOption}`}
                type="button"
                onClick={() => onAddSizeRow(color, sizeOption)}
                className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-[#081c16] transition-colors hover:border-[#081c16] hover:bg-slate-50">
                {sizeOption}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Cliquez plusieurs fois sur la meme taille si elle existe plusieurs
            fois dans cette couleur.
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {validationHintText}
          </p>
        </div>

        {sizeRows.length ? (
          <div className="overflow-x-auto">
            <div className="min-w-[650px]">
              <div className="grid grid-cols-[140px_110px_110px_110px_110px_44px] gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span>Taille</span>
                <span>Total</span>
                <span>Warda</span>
                <span>Hanane</span>
                <span>Amina</span>
                <span />
              </div>

              <div className="mt-3 grid gap-3">
                {sizeRows.map((sizeRow) => {
                  return (
                    <div
                      key={sizeRow.id}
                      className="grid grid-cols-[140px_110px_110px_110px_110px_44px] gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                      <Input
                        id={`${color}-${sizeRow.id}-size`}
                        value={sizeRow.size}
                        onChange={(event) =>
                          onSizeRowFieldChange(
                            color,
                            sizeRow.id,
                            "size",
                            event.target.value,
                          )
                        }
                        placeholder="36 ou XL"
                        className={adminInputClass}
                      />

                      <Input
                        id={`${color}-${sizeRow.id}-quantity`}
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={sizeRow.quantity}
                        onChange={(event) =>
                          onSizeRowFieldChange(
                            color,
                            sizeRow.id,
                            "quantity",
                            event.target.value,
                          )
                        }
                        placeholder="0"
                        className={adminInputClass}
                      />

                      {ownerDisplayOrder.map((owner) => (
                        <Input
                          key={`${sizeRow.id}-${owner}`}
                          id={`${color}-${sizeRow.id}-${owner}`}
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={sizeRow.owners[owner]}
                          onChange={(event) =>
                            onSizeRowOwnerChange(
                              color,
                              sizeRow.id,
                              owner,
                              event.target.value,
                            )
                          }
                          placeholder="0"
                          className={adminInputClass}
                        />
                      ))}

                      <button
                        type="button"
                        onClick={() => onRemoveSizeRow(color, sizeRow.id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-[#081c16]">
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center text-sm leading-6 text-slate-500">
            Aucune taille pour {color}. Utilisez les tailles rapides ou ajoutez
            une ligne vide.
          </div>
        )}
      </div>
    </div>
  );
}

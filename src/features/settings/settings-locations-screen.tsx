"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  settingsLocationsFixture,
  type SettingsLocationRow,
} from "./settings-locations-fixtures";

export function SettingsLocationsScreen() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <section
      aria-label="근무지 설정"
      className="mx-auto flex h-[calc(100vh-202px)] min-h-[620px] w-full max-w-[1580px] flex-col items-end gap-5 tracking-normal"
      data-testid="settings-locations-screen"
    >
      <Button
        type="button"
        variant="secondary"
        data-testid="settings-locations-add-trigger"
        onClick={() => setDialogOpen(true)}
        className="h-[42px] rounded-full px-4 text-h-18-regular font-normal tracking-normal"
      >
        {settingsLocationsFixture.addButtonLabel}
      </Button>

      <LocationsTable />

      {dialogOpen ? (
        <LocationDialog onClose={() => setDialogOpen(false)} />
      ) : null}
    </section>
  );
}

function LocationsTable() {
  return (
    <section
      aria-label="근무지 목록"
      className="min-h-0 w-full flex-1 overflow-hidden rounded-[10px] border border-gray-100 bg-white py-5"
      data-testid="settings-locations-table"
    >
      <div
        className="grid h-[32px] grid-cols-[1fr_1fr_1fr_1fr_240px] items-start border-b border-gray-300 px-5 text-h-18-regular text-gray-500"
        role="row"
      >
        {settingsLocationsFixture.columns.map((column) => (
          <div
            key={column.id}
            className={column.id === "actions" ? "opacity-0" : undefined}
            role="columnheader"
          >
            {column.label}
          </div>
        ))}
      </div>

      <div role="rowgroup">
        {settingsLocationsFixture.rows.map((row, index) => (
          <LocationTableRow key={row.id} first={index === 0} row={row} />
        ))}
      </div>
    </section>
  );
}

function LocationTableRow({
  row,
  first,
}: {
  row: SettingsLocationRow;
  first: boolean;
}) {
  return (
    <div
      className="grid h-[61px] grid-cols-[1fr_1fr_1fr_1fr_240px] items-center border-b border-gray-100 px-5 text-h-18-regular text-gray-800 last:border-b-0"
      role="row"
      data-testid={first ? "settings-locations-first-row" : undefined}
    >
      <div className="min-w-0 truncate" role="cell">
        {row.name}
      </div>
      <div className="min-w-0 truncate" role="cell">
        {row.address}
      </div>
      <div className="min-w-0 truncate" role="cell">
        {row.radius}
      </div>
      <div className="min-w-0 truncate" role="cell">
        {row.dutyCount}
      </div>
      <div className="flex justify-end gap-2.5" role="cell">
        <Button
          type="button"
          variant="secondary"
          className="h-[42px] rounded-full px-4 text-h-18-regular font-medium tracking-normal"
        >
          {settingsLocationsFixture.editButtonLabel}
        </Button>
        <Button
          type="button"
          variant="danger"
          className="h-[42px] rounded-full px-4 text-h-18-regular font-medium tracking-normal text-red-500"
        >
          {settingsLocationsFixture.deleteButtonLabel}
        </Button>
      </div>
    </div>
  );
}

function LocationDialog({ onClose }: { onClose: () => void }) {
  const { dialog } = settingsLocationsFixture;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-location-dialog-title"
        className="flex h-[900px] w-[680px] flex-col rounded-[8px] bg-white px-10 py-10 shadow-[0px_16px_44px_rgba(17,24,39,0.18)]"
        data-testid="settings-location-dialog"
      >
        <h2 id="settings-location-dialog-title" className="text-h-20 text-gray-900">
          {dialog.title}
        </h2>

        <label className="mt-10 block">
          <span className="text-h-18-semibold text-gray-900">
            {dialog.nameLabel}
          </span>
          <input
            readOnly
            placeholder={dialog.namePlaceholder}
            className="mt-3 h-[49px] w-full rounded-[8px] border border-gray-200 bg-gray-50 px-4 text-h-18-regular text-gray-800 outline-none placeholder:text-gray-400"
          />
        </label>

        <label className="mt-8 block">
          <span className="text-h-18-semibold text-gray-900">
            {dialog.addressLabel}
          </span>
          <input
            readOnly
            placeholder={dialog.addressPlaceholder}
            className="mt-3 h-[49px] w-full rounded-[8px] border border-gray-200 bg-gray-50 px-4 text-h-18-regular text-gray-800 outline-none placeholder:text-gray-400"
          />
        </label>

        <label className="mt-8 block">
          <span className="text-h-18-semibold text-gray-900">
            {dialog.radiusLabel}
          </span>
          <span className="mt-3 flex items-center gap-2.5">
            <input
              readOnly
              value={dialog.radiusValue}
              className="h-[49px] w-60 rounded-[8px] border border-gray-200 bg-gray-50 px-4 text-right text-h-18-regular text-gray-800 outline-none"
            />
            <span className="text-h-18-semibold text-gray-900">
              {dialog.radiusUnit}
            </span>
          </span>
        </label>

        <StaticRadiusMap />

        <div className="mt-auto flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="h-[50px] rounded-[8px] px-6 text-h-18-semibold tracking-normal"
          >
            {dialog.cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onClose}
            className="h-[50px] rounded-[8px] px-6 text-h-18-semibold tracking-normal text-white"
          >
            {dialog.addLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

function StaticRadiusMap() {
  return (
    <svg
      role="img"
      aria-label="출퇴근 허용 반경 지도"
      className="mt-8 h-80 w-full overflow-hidden bg-[#eef6ff]"
      data-testid="settings-location-map"
      viewBox="0 0 600 320"
    >
      <rect width="600" height="320" fill="#edf6ff" />
      <path d="M0 250L150 220L280 250L600 226V320H0Z" fill="#eaf7df" />
      <path d="M0 22L95 42L165 112L128 320H0Z" fill="#f5f1e8" />
      <path d="M430 0H600V320H490L520 216L492 104Z" fill="#f6f2ec" />
      <path d="M60 155L126 92L214 105L278 164L248 246L138 260Z" fill="#eef4eb" />
      <path d="M330 28L430 48L468 116L444 205L358 226L284 172L285 84Z" fill="#eef4eb" />
      <g fill="none" stroke="#d7dce2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-20 38C60 54 107 60 160 72C237 90 278 106 330 116C421 134 513 122 628 95" strokeWidth="28" />
        <path d="M-16 42C62 58 109 64 161 76C238 94 280 110 331 120C421 138 514 126 628 99" stroke="#fff" strokeWidth="24" />
        <path d="M-12 218C92 204 181 202 278 188C370 174 485 158 628 148" strokeWidth="32" />
        <path d="M-12 222C92 208 181 206 278 192C370 178 485 162 628 152" stroke="#fff" strokeWidth="28" />
        <path d="M70 -12C92 58 116 116 152 168C190 224 224 274 252 340" strokeWidth="24" />
        <path d="M72 -12C94 58 118 116 154 168C192 224 226 274 254 340" stroke="#fff" strokeWidth="20" />
        <path d="M248 -20C216 43 181 94 142 148C102 205 72 257 38 340" strokeWidth="25" />
        <path d="M250 -20C218 43 183 94 144 148C104 205 74 257 40 340" stroke="#fff" strokeWidth="21" />
        <path d="M572 -20C548 60 518 124 494 194C472 258 454 294 438 340" strokeWidth="22" />
        <path d="M574 -20C550 60 520 124 496 194C474 258 456 294 440 340" stroke="#fff" strokeWidth="18" />
        <path d="M395 -20C368 32 338 80 308 132C278 185 248 244 224 340" strokeWidth="22" />
        <path d="M397 -20C370 32 340 80 310 132C280 185 250 244 226 340" stroke="#fff" strokeWidth="18" />
        <path d="M142 6L205 62L258 93L320 154L388 213L468 268" strokeWidth="14" />
        <path d="M144 8L207 64L260 95L322 156L390 215L470 270" stroke="#fff" strokeWidth="10" />
        <path d="M16 300C84 284 144 272 214 258C298 241 372 233 590 230" strokeWidth="13" />
        <path d="M18 302C86 286 146 274 216 260C300 243 374 235 590 232" stroke="#fff" strokeWidth="9" />
      </g>
      <g fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8">
        <path d="M22 98L84 112L130 138L202 142L262 132" />
        <path d="M18 176L92 164L158 174L225 166L302 148" />
        <path d="M336 72L400 92L456 88L532 70" />
        <path d="M344 252L410 242L462 250L530 244" />
        <path d="M458 24L498 78L526 128L590 172" />
      </g>
      <g fill="none" stroke="#c084fc" strokeLinecap="round" strokeLinejoin="round">
        <path d="M590 0L562 70L558 152L586 242L574 320" strokeWidth="5" />
        <path d="M578 4L552 72L548 152L574 242L564 320" strokeWidth="3" strokeDasharray="10 8" />
      </g>
      <circle cx="370" cy="176" r="110" fill="#a7f3d0" fillOpacity="0.43" stroke="#30c179" strokeWidth="1" />
      <circle cx="370" cy="176" r="18" fill="#93c5fd" fillOpacity="0.95" />
      <circle cx="370" cy="176" r="12" fill="#3b82f6" />
      <g fontFamily="Pretendard Variable, Pretendard, sans-serif" fontSize="17" fontWeight="600">
        <text x="74" y="146" fill="#6b7280">도원</text>
        <text x="54" y="170" fill="#6b7280">센트레빌아파트</text>
        <text x="238" y="236" fill="#3b82f6">경기대학교</text>
        <text x="236" y="258" fill="#3b82f6">서울캠퍼스</text>
        <text x="398" y="196" fill="#3b82f6">인창고등학교</text>
        <text x="448" y="60" fill="#6b7280">서대문성당</text>
        <text x="518" y="46" fill="#3b82f6">중앙대</text>
        <text x="506" y="68" fill="#3b82f6">평동캠퍼스</text>
        <text x="18" y="300" fill="#8b7a6a">서왕공원</text>
        <text x="30" y="318" fill="#8b7a6a">숲허브</text>
      </g>
    </svg>
  );
}

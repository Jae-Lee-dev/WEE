"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { Badge as Tag } from "@/components/ui/badge";
import { FilterChip } from "@/components/ui/filter-chip";
import { Segment } from "@/components/ui/segment";
import { FilterTabs } from "@/components/ui/filter-tabs";
import {
  IconSearch,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconChevronLeft,
  IconChevronRight,
  IconHome,
  IconSetting,
  IconNote,
  IconPerson,
  IconCalendar,
  IconMoney,
  IconBook,
  IconNotice,
} from "@/components/icons";

const colorGroups = [
  {
    name: "Gray",
    items: [
      { token: "gray-50", className: "bg-gray-50", hex: "#F9FAFB" },
      { token: "gray-100", className: "bg-gray-100", hex: "#F3F4F6" },
      { token: "gray-200", className: "bg-gray-200", hex: "#E5E7EB" },
      { token: "gray-300", className: "bg-gray-300", hex: "#D1D5DB" },
      { token: "gray-400", className: "bg-gray-400", hex: "#9CA3AF" },
      { token: "gray-500", className: "bg-gray-500", hex: "#6B7280" },
      { token: "gray-600", className: "bg-gray-600", hex: "#4B5563" },
      { token: "gray-700", className: "bg-gray-700", hex: "#374151" },
      { token: "gray-800", className: "bg-gray-800", hex: "#1E293B" },
      { token: "gray-900", className: "bg-gray-900", hex: "#111827" },
    ],
  },
  {
    name: "Green",
    items: [
      { token: "green-50", className: "bg-green-50", hex: "#F9FEFB" },
      { token: "green-100", className: "bg-green-100", hex: "#E9FDF1" },
      { token: "green-200", className: "bg-green-200", hex: "#C6F5D9" },
      { token: "green-300", className: "bg-green-300", hex: "#83DAA6" },
      { token: "green-400", className: "bg-green-400", hex: "#30C179" },
      { token: "green-450", className: "bg-green-450", hex: "#23A866" },
      { token: "green-500", className: "bg-green-500", hex: "#178D52" },
    ],
  },
  {
    name: "Orange",
    items: [
      { token: "orange-100", className: "bg-orange-100", hex: "#FFF6E8" },
      { token: "orange-400", className: "bg-orange-400", hex: "#FFB240" },
    ],
  },
  {
    name: "Red",
    items: [
      { token: "red-50", className: "bg-red-50", hex: "#FFF5F8" },
      { token: "red-100", className: "bg-red-100", hex: "#FCDDE5" },
      { token: "red-500", className: "bg-red-500", hex: "#F66689" },
    ],
  },
  {
    name: "Blue",
    items: [
      { token: "blue-50", className: "bg-blue-50", hex: "#EFF6FF" },
      { token: "blue-500", className: "bg-blue-500", hex: "#3B82F6" },
    ],
  },
  {
    name: "Neutrals",
    items: [
      { token: "white", className: "bg-white", hex: "#FEFEFE" },
      { token: "black", className: "bg-black", hex: "#212121" },
    ],
  },
];

const typeGroups: { group: string; items: { token: string; sample: string }[] }[] = [
  {
    group: "Heading",
    items: [
      { token: "text-h-32", sample: "32 SemiBold · 가입 정보 페이지" },
      { token: "text-h-24", sample: "24 Bold · 가입 정보 페이지" },
      { token: "text-h-20", sample: "20 SemiBold · 가입 정보" },
      { token: "text-h-18-semibold", sample: "18 SemiBold · 가입 정보" },
      { token: "text-h-18-regular", sample: "18 Regular · 가입 정보" },
      { token: "text-h-16-semibold", sample: "16 SemiBold · 가입 정보" },
      { token: "text-h-16-medium", sample: "16 Medium · 가입 정보" },
      { token: "text-h-14-semibold", sample: "14 SemiBold · 가입 정보" },
      { token: "text-h-14-regular", sample: "14 Regular · 가입 정보" },
      { token: "text-h-12-medium", sample: "12 Medium · 가입 정보" },
    ],
  },
  {
    group: "Body",
    items: [
      { token: "text-body-16-medium", sample: "16 Medium · 본문 텍스트 샘플 ABC가나다 123" },
      { token: "text-body-16-regular", sample: "16 Regular · 본문 텍스트 샘플 ABC가나다 123" },
      { token: "text-body-14-medium", sample: "14 Medium · 본문 텍스트 샘플" },
      { token: "text-body-14-regular", sample: "14 Regular · 본문 텍스트 샘플" },
    ],
  },
  {
    group: "Detail",
    items: [
      { token: "text-detail-16-semibold", sample: "16 SemiBold · 보조 정보 (Tag M)" },
      { token: "text-detail-16-regular", sample: "16 Regular · 보조 정보 (Tag M grey)" },
      { token: "text-detail-12", sample: "12 Regular · 보조 정보" },
      { token: "text-detail-11-medium", sample: "11 Medium · 보조 정보" },
      { token: "text-detail-10", sample: "10 Regular · 보조 정보" },
    ],
  },
  {
    group: "Label",
    items: [
      { token: "text-label-18", sample: "18 Medium · UI 라벨" },
      { token: "text-label-14-medium", sample: "14 Medium · UI 라벨" },
      { token: "text-label-14-regular", sample: "14 Regular · UI 라벨" },
      { token: "text-label-12-medium", sample: "12 Medium · UI 라벨" },
      { token: "text-label-12-regular", sample: "12 Regular · UI 라벨" },
      { token: "text-label-11", sample: "11 Regular · UI 라벨" },
    ],
  },
];

const tagVariants = ["green", "orange", "red", "blue", "grey", "outline"] as const;

const filterOptions = [
  { value: "active", label: "활성 17" },
  { value: "inactive", label: "비활성 3" },
];
const filterChipOptions = [
  { value: "all", label: "전체" },
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
];
const segmentOptions = [
  { value: "hourly", label: "시급" },
  { value: "monthly", label: "월급" },
];

const navIcons = [
  { name: "IconHome", Cmp: IconHome },
  { name: "IconSetting", Cmp: IconSetting },
  { name: "IconNote", Cmp: IconNote },
  { name: "IconPerson", Cmp: IconPerson },
  { name: "IconCalendar", Cmp: IconCalendar },
  { name: "IconMoney", Cmp: IconMoney },
  { name: "IconBook", Cmp: IconBook },
  { name: "IconCheck", Cmp: IconCheck },
  { name: "IconSearch", Cmp: IconSearch },
];

const arrowIcons = [
  { name: "ChevronUp", Cmp: IconChevronUp },
  { name: "ChevronDown", Cmp: IconChevronDown },
  { name: "ChevronLeft", Cmp: IconChevronLeft },
  { name: "ChevronRight", Cmp: IconChevronRight },
];

export default function Page() {
  const [filterValue, setFilterValue] = useState("active");
  const [filterChipValue, setFilterChipValue] = useState("all");
  const [segmentValue, setSegmentValue] = useState("hourly");
  const [searchValue, setSearchValue] = useState("");

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-12">
      <header className="mb-12">
        <h1 className="text-h-32 text-gray-900">Wee Admin Design Tokens</h1>
        <p className="mt-2 text-body-16-regular text-gray-500">
          docs/wee-design-tokens-v1.0.md · Pretendard · letter-spacing -0.02em
        </p>
      </header>

      <section className="mb-16">
        <h2 className="mb-6 text-h-20 text-gray-900">Color</h2>
        <div className="space-y-8">
          {colorGroups.map((group) => (
            <div key={group.name}>
              <h3 className="mb-3 text-h-16-semibold text-gray-700">
                {group.name}
              </h3>
              <div className="flex flex-wrap gap-3">
                {group.items.map((c) => (
                  <div key={c.token} className="w-[120px]">
                    <div
                      className={`${c.className} h-[80px] w-full rounded-md border border-gray-200`}
                    />
                    <div className="mt-2">
                      <div className="text-label-12-medium text-gray-900">
                        {c.token}
                      </div>
                      <div className="text-detail-11-medium text-gray-500">
                        {c.hex}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-6 text-h-20 text-gray-900">Typography</h2>
        <div className="space-y-10">
          {typeGroups.map((g) => (
            <div key={g.group}>
              <h3 className="mb-3 text-h-16-semibold text-gray-700">
                {g.group}
              </h3>
              <div className="space-y-3">
                {g.items.map((t) => (
                  <div
                    key={t.token}
                    className="flex items-baseline gap-6 border-b border-gray-100 pb-3"
                  >
                    <code className="w-[200px] shrink-0 text-detail-11-medium text-gray-500">
                      {t.token}
                    </code>
                    <span className={`${t.token} text-gray-900`}>
                      {t.sample}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-2 text-h-20 text-gray-900">Button</h2>
        <p className="mb-6 text-detail-12 text-gray-500">
          Figma: button_M (52:2891) · 3 variants
        </p>
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-h-16-semibold text-gray-700">Variants</h3>
            <div className="flex items-start gap-3">
              <Button variant="primary">저장</Button>
              <Button variant="secondary">취소</Button>
              <Button variant="danger">반려</Button>
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-h-16-semibold text-gray-700">Disabled</h3>
            <div className="flex items-start gap-3">
              <Button variant="primary" disabled>
                저장
              </Button>
              <Button variant="secondary" disabled>
                취소
              </Button>
              <Button variant="danger" disabled>
                반려
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-2 text-h-20 text-gray-900">SearchField</h2>
        <p className="mb-6 text-detail-12 text-gray-500">
          Figma: textfield_search (10:1364) · controlled input + 우측 search icon
        </p>
        <div className="space-y-4">
          <SearchField
            placeholder="검색어를 입력해 주세요"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-[416px]"
          />
          <p className="text-detail-12 text-gray-500">
            value: {searchValue || "(empty)"}
          </p>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-2 text-h-20 text-gray-900">Tag</h2>
        <p className="mb-6 text-detail-12 text-gray-500">
          Figma: tag_M (10:1406) · tag_L (52:2762) · 6 variants × 2 sizes
        </p>
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-h-16-semibold text-gray-700">
              Size M (16px)
            </h3>
            <div className="flex flex-wrap items-start gap-2">
              {tagVariants.map((v) => (
                <Tag key={v} variant={v} size="M">
                  승인 대기
                </Tag>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-h-16-semibold text-gray-700">
              Size L (18px)
            </h3>
            <div className="flex flex-wrap items-start gap-2">
              {tagVariants.map((v) => (
                <Tag key={v} variant={v} size="L">
                  승인 대기
                </Tag>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-2 text-h-20 text-gray-900">FilterChip</h2>
        <p className="mb-6 text-detail-12 text-gray-500">
          Figma: tag_L state (15:4656) · selectable single filter chip
        </p>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip variant="selected" aria-pressed>
              전체
            </FilterChip>
            <FilterChip variant="neutral" aria-pressed={false}>
              전체
            </FilterChip>
            <FilterChip variant="danger" aria-pressed={false}>
              전체
            </FilterChip>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filterChipOptions.map((option) => {
              const isSelected = filterChipValue === option.value;

              return (
                <FilterChip
                  key={option.value}
                  variant={isSelected ? "selected" : "neutral"}
                  aria-pressed={isSelected}
                  onClick={() => setFilterChipValue(option.value)}
                >
                  {option.label}
                </FilterChip>
              );
            })}
          </div>
          <p className="text-detail-12 text-gray-500">
            value: {filterChipValue}
          </p>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-2 text-h-20 text-gray-900">Segment</h2>
        <p className="mb-6 text-detail-12 text-gray-500">
          Figma: toggle_급여 (52:2823) · 2-way block, full-width
        </p>
        <div className="space-y-3">
          <Segment
            options={segmentOptions}
            value={segmentValue}
            onChange={setSegmentValue}
            className="w-[601px]"
          />
          <p className="text-detail-12 text-gray-500">value: {segmentValue}</p>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-2 text-h-20 text-gray-900">FilterTabs</h2>
        <p className="mb-6 text-detail-12 text-gray-500">
          Figma: toggle_조교목록 (10:2920) · pill, count 포함 라벨
        </p>
        <div className="space-y-3">
          <FilterTabs
            options={filterOptions}
            value={filterValue}
            onChange={setFilterValue}
          />
          <p className="text-detail-12 text-gray-500">value: {filterValue}</p>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-2 text-h-20 text-gray-900">Icons (임시)</h2>
        <p className="mb-6 text-detail-12 text-gray-500">
          Figma 정확 SVG 추출 전 generic line icons. arrow 4방향 + nav 8 + search/check
        </p>
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-h-16-semibold text-gray-700">Chevron</h3>
            <div className="flex flex-wrap gap-6">
              {arrowIcons.map(({ name, Cmp }) => (
                <div key={name} className="flex flex-col items-center gap-2">
                  <Cmp className="size-6 text-gray-700" />
                  <code className="text-detail-11-medium text-gray-500">
                    {name}
                  </code>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-h-16-semibold text-gray-700">
              Navigation / Action
            </h3>
            <div className="flex flex-wrap gap-6">
              {navIcons.map(({ name, Cmp }) => (
                <div key={name} className="flex flex-col items-center gap-2">
                  <Cmp className="size-6 text-gray-700" />
                  <code className="text-detail-11-medium text-gray-500">
                    {name}
                  </code>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-h-16-semibold text-gray-700">Notice</h3>
            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col items-center gap-2">
                <IconNotice className="size-6 text-gray-700" />
                <code className="text-detail-11-medium text-gray-500">
                  none
                </code>
              </div>
              <div className="flex flex-col items-center gap-2">
                <IconNotice
                  className="size-6 text-gray-700"
                  hasNotice
                />
                <code className="text-detail-11-medium text-gray-500">
                  notice
                </code>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

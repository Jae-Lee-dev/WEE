import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import {
  TagSearchPicker,
  type TagSearchPickerOption,
} from "@/shared/ui/tag-search-picker";

const workerTagOptions = [
  {
    value: "middle-math",
    label: "중등 수학",
    description: "월수금 정규반",
  },
  {
    value: "high-math",
    label: "고등 수학",
    description: "수능 대비반",
  },
  {
    value: "exam",
    label: "내신 대비",
    description: "시험 기간 집중",
  },
  {
    value: "new-worker",
    label: "신규 조교",
    description: "온보딩 필요",
  },
  {
    value: "veteran",
    label: "베테랑",
    description: "대체 근무 우선",
  },
  {
    value: "weekend",
    label: "주말 가능",
    description: "토요일 배치 가능",
  },
  {
    value: "deep-high-school",
    label: "고3 심화",
    description: "상위권 문제 풀이",
  },
  {
    value: "makeup-class",
    label: "보강 전담",
    description: "결석 보강 우선",
  },
  {
    value: "online-qna",
    label: "온라인 질의응답",
    description: "비대면 질문 처리",
  },
  {
    value: "material-maker",
    label: "자료 제작",
    description: "프린트 정리",
  },
  {
    value: "disabled",
    label: "비활성 태그",
    description: "선택할 수 없는 예시",
    disabled: true,
  },
] satisfies readonly TagSearchPickerOption[];

const meta = {
  title: "Design System/Composed/TagSearchPicker",
  component: TagSearchPicker,
  tags: ["autodocs"],
  args: {
    allowCreate: true,
    options: workerTagOptions,
    placeholder: "근무자 태그 검색",
  },
  argTypes: {
    onValueChange: { action: "value changed" },
  },
} satisfies Meta<typeof TagSearchPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: function Render(args) {
    return (
      <div className="w-[440px]">
        <TagSearchPicker {...args} />
      </div>
    );
  },
};

export const OpenList: Story = {
  args: {
    defaultOpen: true,
  },
  render: function Render(args) {
    return (
      <div className="w-[440px] pb-72">
        <TagSearchPicker {...args} />
      </div>
    );
  },
};

export const SelectedInlineTags: Story = {
  args: {
    defaultOpen: true,
    defaultValue: ["middle-math", "exam", "weekend"],
  },
  render: function Render(args) {
    return (
      <div className="w-[520px] pb-72">
        <TagSearchPicker {...args} />
      </div>
    );
  },
};

export const ManySelectedTags: Story = {
  args: {
    defaultValue: [
      "middle-math",
      "high-math",
      "exam",
      "new-worker",
      "veteran",
      "weekend",
      "deep-high-school",
      "makeup-class",
      "online-qna",
      "material-maker",
    ],
  },
  render: function Render(args) {
    return (
      <div className="w-[360px]">
        <TagSearchPicker {...args} />
      </div>
    );
  },
};

export const Filtering: Story = {
  args: {
    defaultInputValue: "수학",
    defaultOpen: true,
    defaultValue: ["exam"],
  },
  render: function Render(args) {
    return (
      <div className="w-[440px] pb-56">
        <TagSearchPicker {...args} />
      </div>
    );
  },
};

export const CreateNewTag: Story = {
  args: {
    defaultInputValue: "고3 심화",
    defaultOpen: true,
  },
  render: function Render(args) {
    return (
      <div className="w-[440px] pb-56">
        <TagSearchPicker
          {...args}
          createLabel={(query) => (
            <>
              새 태그 <span className="font-semibold text-gray-900">{query}</span>
              를 추가
            </>
          )}
        />
      </div>
    );
  },
};

export const EmptyState: Story = {
  args: {
    allowCreate: false,
    defaultInputValue: "없는 태그",
    defaultOpen: true,
    emptyMessage: "검색 결과가 없습니다.",
  },
  render: function Render(args) {
    return (
      <div className="w-[440px] pb-32">
        <TagSearchPicker {...args} />
      </div>
    );
  },
};

export const Controlled: Story = {
  render: function Render(args) {
    const [options, setOptions] =
      useState<readonly TagSearchPickerOption[]>(workerTagOptions);
    const [value, setValue] = useState<readonly string[]>([
      "middle-math",
      "weekend",
    ]);

    return (
      <div className="grid w-[520px] gap-3 pb-72">
        <TagSearchPicker
          {...args}
          defaultOpen
          options={options}
          value={value}
          onCreateOption={(label) => {
            const option = {
              value: `custom:${label}`,
              label,
              description: "방금 추가됨",
            };

            setOptions((currentOptions) =>
              currentOptions.some((item) => item.value === option.value)
                ? currentOptions
                : [...currentOptions, option],
            );

            return option;
          }}
          onValueChange={setValue}
        />
        <div className="rounded-[6px] border border-gray-100 bg-gray-50 px-3 py-2 text-label-12-regular tracking-normal text-gray-600">
          선택값: {value.length > 0 ? value.join(", ") : "(empty)"}
        </div>
      </div>
    );
  },
};

export const Invalid: Story = {
  args: {
    defaultOpen: true,
    invalid: true,
  },
  render: function Render(args) {
    return (
      <div className="grid w-[440px] gap-2 pb-72">
        <TagSearchPicker {...args} />
        <p className="text-label-12-medium tracking-normal text-red-500">
          태그를 1개 이상 선택해 주세요.
        </p>
      </div>
    );
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: ["middle-math", "exam"],
    disabled: true,
  },
  render: function Render(args) {
    return (
      <div className="w-[440px]">
        <TagSearchPicker {...args} />
      </div>
    );
  },
};

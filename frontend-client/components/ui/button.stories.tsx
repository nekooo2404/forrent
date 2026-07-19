import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { Plus, Trash2, Save } from "@/components/ui/icons";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "danger"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    loading: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: "Primary Button",
    variant: "primary",
    size: "md",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary Button",
    variant: "secondary",
    size: "md",
  },
};

export const Ghost: Story = {
  args: {
    children: "Ghost Button",
    variant: "ghost",
    size: "md",
  },
};

export const Danger: Story = {
  args: {
    children: "Danger Button",
    variant: "danger",
    size: "md",
  },
};

export const WithIcon: Story = {
  args: {
    children: "Thêm mới",
    variant: "primary",
    icon: <Plus size={18} />,
  },
};

export const Loading: Story = {
  args: {
    children: "Đang xử lý",
    variant: "primary",
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: "Disabled Button",
    variant: "primary",
    disabled: true,
  },
};

export const Small: Story = {
  args: {
    children: "Small Button",
    variant: "primary",
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    children: "Large Button",
    variant: "primary",
    size: "lg",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </div>
      <div className="flex gap-3">
        <Button icon={<Plus size={16} />} size="sm" variant="primary">
          Thêm
        </Button>
        <Button icon={<Save size={16} />} size="sm" variant="secondary">
          Lưu
        </Button>
        <Button icon={<Trash2 size={16} />} size="sm" variant="danger">
          Xóa
        </Button>
      </div>
      <div className="flex gap-3">
        <Button loading variant="primary">
          Đang xử lý
        </Button>
        <Button disabled variant="primary">
          Disabled
        </Button>
      </div>
    </div>
  ),
};

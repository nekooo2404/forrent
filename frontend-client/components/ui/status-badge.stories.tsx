import type { Meta, StoryObj } from "@storybook/react";
import { StatusBadge } from "./status-badge";

const meta = {
  title: "UI/StatusBadge",
  component: StatusBadge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RoomAvailable: Story = {
  args: {
    status: "PUBLISHED",
    type: "room",
  },
};

export const RoomUnavailable: Story = {
  args: {
    status: "RENTED",
    type: "room",
  },
};

export const RoomHidden: Story = {
  args: {
    status: "HIDDEN",
    type: "room",
  },
};

export const BlogDraft: Story = {
  args: {
    status: "DRAFT",
    type: "blog",
  },
};

export const BlogPublished: Story = {
  args: {
    status: "PUBLISHED",
    type: "blog",
  },
};

export const AllRoomStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <StatusBadge status="DRAFT" type="room" />
      <StatusBadge status="PENDING_REVIEW" type="room" />
      <StatusBadge status="PUBLISHED" type="room" />
      <StatusBadge status="RENTED" type="room" />
      <StatusBadge status="HIDDEN" type="room" />
      <StatusBadge status="ARCHIVED" type="room" />
    </div>
  ),
};

export const AllBlogStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <StatusBadge status="DRAFT" type="blog" />
      <StatusBadge status="PUBLISHED" type="blog" />
      <StatusBadge status="HIDDEN" type="blog" />
    </div>
  ),
};

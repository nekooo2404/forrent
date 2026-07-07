import type { Meta, StoryObj } from "@storybook/react";
import { Home, Plus, Trash2 } from "lucide-react";

import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { FormField } from "./form-field";
import { StatusBadge } from "./status-badge";

const meta = {
  title: "UI/Component Library",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Showcase: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-8 bg-surface p-6 text-on-surface">
      <section className="grid gap-3">
        <h2 className="text-xl font-semibold text-primary">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button icon={<Plus size={16} />}>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button icon={<Trash2 size={16} />} variant="danger">
            Danger
          </Button>
          <Button loading>Loading</Button>
        </div>
      </section>

      <section className="grid max-w-md gap-3">
        <h2 className="text-xl font-semibold text-primary">Form Field</h2>
        <FormField helperText="Helper text uses the shared secondary token." label="Email" required>
          <input
            className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface"
            placeholder="you@example.com"
            type="email"
          />
        </FormField>
        <FormField error="This is a field-level validation error." label="Phone">
          <input
            className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface"
            placeholder="0900 000 000"
            type="tel"
          />
        </FormField>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold text-primary">Status Badges</h2>
        <div className="flex flex-wrap gap-3">
          <StatusBadge status="AVAILABLE" type="room" />
          <StatusBadge status="UNAVAILABLE" type="room" />
          <StatusBadge status="PUBLISHED" type="blog" />
          <StatusBadge status="NEW" type="lead" />
          <StatusBadge status="MOVED_IN" type="lead" />
          <StatusBadge status="CANCELLED" type="lead" />
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold text-primary">Empty State</h2>
        <EmptyState
          action={{ label: "Create listing", onClick: () => undefined }}
          description="Reusable empty state for lists, search results, and admin panels."
          icon={<Home size={28} />}
          title="No rooms yet"
        />
      </section>
    </div>
  ),
};

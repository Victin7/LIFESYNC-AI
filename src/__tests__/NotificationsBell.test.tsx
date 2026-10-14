import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const updateEqMock = vi.fn().mockResolvedValue({ data: null, error: null });

const mockNotifications: { id: string; type: string; title: string; body: string | null; read: boolean; created_at: string }[] = [];

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn((_table: string) => ({
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: mockNotifications, error: null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: updateEqMock,
          }),
        }),
      })),
      channel: () => ({
        on: function () { return this; },
        subscribe: function () { return this; },
      }),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

import { NotificationsBell } from "@/components/NotificationsBell";

describe("NotificationsBell", () => {
  beforeEach(() => {
    mockNotifications.length = 0;
    updateEqMock.mockClear();
  });

  it("renders empty state when no notifications", async () => {
    render(<NotificationsBell />);
    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));
    await waitFor(() => {
      expect(screen.getByText(/nada novo por aqui/i)).toBeTruthy();
    });
  });

  it("shows badge with unread count", async () => {
    mockNotifications.push(
      { id: "1", type: "x", title: "A", body: null, read: false, created_at: new Date().toISOString() },
      { id: "2", type: "x", title: "B", body: null, read: false, created_at: new Date().toISOString() },
      { id: "3", type: "x", title: "C", body: null, read: false, created_at: new Date().toISOString() },
    );
    render(<NotificationsBell />);
    await waitFor(() => {
      expect(screen.getByText("3")).toBeTruthy();
    });
  });

  it("calls supabase update on mark all read", async () => {
    mockNotifications.push(
      { id: "1", type: "x", title: "A", body: null, read: false, created_at: new Date().toISOString() },
    );
    render(<NotificationsBell />);
    await waitFor(() => screen.getByText("1"));
    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));
    await waitFor(() => screen.getByText(/marcar todas/i));
    fireEvent.click(screen.getByText(/marcar todas/i));
    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const h = vi.hoisted(() => ({
  authStateCallback: null as ((event: string, session: unknown) => void) | null,
  mockGetSession: vi.fn(),
  mockSignOut: vi.fn().mockResolvedValue({}),
  mockUnsubscribe: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
        h.authStateCallback = cb;
        return { data: { subscription: { unsubscribe: h.mockUnsubscribe } } };
      }),
      getSession: h.mockGetSession,
      signOut: h.mockSignOut,
    },
  },
}));

function Consumer() {
  const { user, loading } = useAuth();
  if (loading) return <p>carregando</p>;
  if (!user) return <p>sem usuário</p>;
  return <p>usuário: {user.email}</p>;
}

describe("AuthContext", () => {
  beforeEach(() => {
    h.authStateCallback = null;
    h.mockGetSession.mockReset();
    h.mockUnsubscribe.mockClear();
  });

  it("mostra loading enquanto aguarda sessão", () => {
    h.mockGetSession.mockReturnValue(new Promise(() => {}));
    render(<AuthProvider><Consumer /></AuthProvider>);
    expect(screen.getByText("carregando")).toBeTruthy();
  });

  it("mostra 'sem usuário' quando não há sessão", async () => {
    h.mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => {
      expect(screen.getByText("sem usuário")).toBeTruthy();
    });
  });

  it("mostra o usuário quando a sessão existe via getSession", async () => {
    const fakeSession = { user: { email: "test@example.com" } };
    h.mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => {
      expect(screen.getByText("usuário: test@example.com")).toBeTruthy();
    });
  });

  it("atualiza o usuário quando onAuthStateChange dispara SIGNED_IN", async () => {
    h.mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => screen.getByText("sem usuário"));

    act(() => {
      h.authStateCallback?.("SIGNED_IN", { user: { email: "novo@example.com" } });
    });

    await waitFor(() => {
      expect(screen.getByText("usuário: novo@example.com")).toBeTruthy();
    });
  });

  it("limpa o usuário quando onAuthStateChange dispara SIGNED_OUT", async () => {
    const fakeSession = { user: { email: "test@example.com" } };
    h.mockGetSession.mockResolvedValue({ data: { session: fakeSession } });
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => screen.getByText("usuário: test@example.com"));

    act(() => {
      h.authStateCallback?.("SIGNED_OUT", null);
    });

    await waitFor(() => {
      expect(screen.getByText("sem usuário")).toBeTruthy();
    });
  });

  it("chama unsubscribe ao desmontar o provider", async () => {
    h.mockGetSession.mockResolvedValue({ data: { session: null } });
    const { unmount } = render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => screen.getByText("sem usuário"));
    unmount();
    expect(h.mockUnsubscribe).toHaveBeenCalled();
  });
});

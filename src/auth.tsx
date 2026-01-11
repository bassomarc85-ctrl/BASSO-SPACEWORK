import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AuthContextValue = {
  loading: boolean;
  error: string | null;
  session: Session | null;
  user: User | null;
  signInWithPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetLocalAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function withTimeout<T>(p: Promise<T>, ms = 10000, label = "Supabase timeout"): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(label)), ms)),
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  async function resetLocalAuth() {
    try {
      // Limpia cualquier sesión “vieja” o inconsistente del navegador
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    try {
      await supabase.auth.signOut();
    } catch {}
    setSession(null);
    setUser(null);
  }

  async function signOut() {
    setError(null);
    try {
      await withTimeout(supabase.auth.signOut(), 10000, "Timeout cerrando sesión");
    } catch (e: any) {
      // incluso si falla el signOut remoto, limpia el estado local
      console.error(e);
    } finally {
      setSession(null);
      setUser(null);
    }
  }

  async function signInWithPassword(email: string, password: string) {
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        10000,
        "Timeout iniciando sesión (Supabase)"
      );

      if (error) {
        setError(error.message);
        return { ok: false, error: error.message };
      }

      setSession(data.session ?? null);
      setUser(data.user ?? null);
      return { ok: true };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setLoading(true);
      setError(null);

      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          10000,
          "Timeout cargando sesión (Supabase)"
        );

        if (!mounted) return;
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        console.error("Auth bootstrap error:", msg);

        if (!mounted) return;
        setError(msg);

        // Si el bootstrap falla, forzamos limpieza para no quedarse en “Cargando…”
        await resetLocalAuth();
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      error,
      session,
      user,
      signInWithPassword,
      signOut,
      resetLocalAuth,
    }),
    [loading, error, session, user]
  );

  // UI mínima de “loading” y recuperación (evita pantalla infinita)
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0b1220", color: "#fff", padding: 24 }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Cargando…</div>
            <div style={{ opacity: 0.85 }}>
              Inicializando sesión y conexión con Supabase.
            </div>

            {error ? (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(255,0,0,0.12)" }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Error:</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{error}</div>

                <button
                  onClick={async () => {
                    await resetLocalAuth();
                    window.location.href = "/login";
                  }}
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Reiniciar sesión y volver a Login
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

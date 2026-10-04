import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, User, ArrowLeft, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';

interface AdminLoginProps {
  onReturnToKiosk: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onReturnToKiosk }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState<string>('admin');
  const [password, setPassword] = useState<string>('Admin2026!*');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg('Por favor complete todos los campos.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await login(identifier.trim(), password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de autenticación';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const setDemoUser = (user: string, pass: string) => {
    setIdentifier(user);
    setPassword(pass);
    setErrorMsg(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 20%, rgba(0, 242, 254, 0.08) 0%, #070a13 70%)',
        padding: '24px',
      }}
    >
      {/* Return button */}
      <div style={{ width: '100%', maxWidth: '440px', marginBottom: '16px' }}>
        <button
          onClick={onReturnToKiosk}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} /> Volver al Kiosko Biométrico
        </button>
      </div>

      {/* Main Login Card */}
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          border: '1px solid rgba(0, 242, 254, 0.25)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 242, 254, 0.1)',
        }}
      >
        {/* Shield Icon Badge */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.25) 0%, rgba(79, 172, 254, 0.05) 100%)',
            border: '1px solid var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            boxShadow: '0 0 25px rgba(0, 242, 254, 0.3)',
          }}
        >
          <Shield size={32} color="var(--accent-cyan)" />
        </div>

        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, textAlign: 'center', letterSpacing: '0.04em' }}>
          ACCESO ADMINISTRATIVO
        </h2>
        <p
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginTop: '4px',
            marginBottom: '24px',
          }}
        >
          Portal Corporativo de RRHH y Gestión de Políticas de Modelos
        </p>

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 75, 92, 0.12)',
              border: '1px solid rgba(255, 75, 92, 0.4)',
              color: 'var(--accent-coral)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
              }}
            >
              Usuario o Correo Corporativo
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="ej: admin o admin@rapture.corp"
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 38px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(8, 12, 22, 0.8)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
              }}
            >
              Contraseña de Acceso
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 38px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(8, 12, 22, 0.8)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
              color: '#070a13',
              fontSize: '0.9rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 0 20px rgba(0, 242, 254, 0.35)',
            }}
          >
            <KeyRound size={18} />
            {loading ? 'AUTENTICANDO...' : 'INICIAR SESIÓN SEGURA'}
          </button>
        </form>

        {/* Demo Fast Access Credentials */}
        <div style={{ width: '100%', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '10px', textAlign: 'center' }}>
            PERFILES DE PRUEBA RBAC (Haga clic para autocompletar):
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={() => setDemoUser('admin', 'Admin2026!*')}
              style={{
                padding: '6px 8px',
                borderRadius: '4px',
                background: 'rgba(0, 242, 254, 0.1)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                color: 'var(--accent-cyan)',
                fontSize: '0.72rem',
                fontWeight: 700,
                textAlign: 'left',
              }}
            >
              Super Administrador
            </button>
            <button
              onClick={() => setDemoUser('rrhh_directora', 'Admin2026!*')}
              style={{
                padding: '6px 8px',
                borderRadius: '4px',
                background: 'rgba(79, 172, 254, 0.1)',
                border: '1px solid rgba(79, 172, 254, 0.3)',
                color: 'var(--accent-blue)',
                fontSize: '0.72rem',
                fontWeight: 700,
                textAlign: 'left',
              }}
            >
              Administrador RRHH
            </button>
            <button
              onClick={() => setDemoUser('supervisor_norte', 'Admin2026!*')}
              style={{
                padding: '6px 8px',
                borderRadius: '4px',
                background: 'rgba(0, 245, 160, 0.1)',
                border: '1px solid rgba(0, 245, 160, 0.3)',
                color: 'var(--accent-emerald)',
                fontSize: '0.72rem',
                fontWeight: 700,
                textAlign: 'left',
              }}
            >
              Supervisor Sede Norte
            </button>
            <button
              onClick={() => setDemoUser('auditor_externo', 'Admin2026!*')}
              style={{
                padding: '6px 8px',
                borderRadius: '4px',
                background: 'rgba(255, 184, 0, 0.1)',
                border: '1px solid rgba(255, 184, 0, 0.3)',
                color: 'var(--accent-amber)',
                fontSize: '0.72rem',
                fontWeight: 700,
                textAlign: 'left',
              }}
            >
              Auditor de Cumplimiento
            </button>
          </div>
        </div>

        {/* Security badge footer */}
        <div
          style={{
            marginTop: '20px',
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            textAlign: 'center',
          }}
        >
          <CheckCircle2 size={12} color="var(--accent-emerald)" />
          <span>Políticas de Bloqueo Activas • Registro Inmutable de Auditoría</span>
        </div>
      </div>
    </div>
  );
};

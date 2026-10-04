import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { OrganizacionManager } from './OrganizacionManager';
import { EmpleadosManager } from './EmpleadosManager';
import { AsistenciasAuditoria } from './AsistenciasAuditoria';
import { SeguridadManager } from './SeguridadManager';
import {
  LayoutDashboard,
  Network,
  Users,
  CalendarCheck,
  ArrowLeft,
  Shield,
  LogOut,
  Building2,
} from 'lucide-react';

interface AdminPortalProps {
  onReturnToKiosk: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onReturnToKiosk }) => {
  const { user, isAuthenticated, logout, hasPermission, getModelScope } = useAuth();
  const [currentSection, setCurrentSection] = useState<
    'dashboard' | 'organizacion' | 'empleados' | 'asistencias' | 'seguridad'
  >('dashboard');

  // Si no está autenticado, renderizar la puerta de enlace de seguridad
  if (!isAuthenticated || !user) {
    return <AdminLogin onReturnToKiosk={onReturnToKiosk} />;
  }

  const canViewOrganizacion = hasPermission('sedes', 'leer') || hasPermission('departamentos', 'leer');
  const canViewEmpleados = hasPermission('empleados', 'leer');
  const canViewAsistencias = hasPermission('asistencias', 'leer');
  const canViewSeguridad = hasPermission('seguridad', 'leer') || user.rol_codigo === 'SUPER_ADMIN';

  const sedeScope = getModelScope('empleados');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Top Admin Sub-Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 28px',
          background: 'rgba(14, 21, 38, 0.95)',
          borderBottom: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Left: Navigation and Return */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onReturnToKiosk}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.06)',
              color: 'var(--accent-cyan)',
              fontSize: '0.78rem',
              fontWeight: 700,
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={15} /> Kiosko
          </button>
          <div style={{ height: '20px', width: '1px', background: 'var(--border-subtle)' }} />
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.04em' }}>
              RAPTURE <span style={{ color: 'var(--accent-cyan)', fontWeight: 400 }}>PORTAL ADMIN</span>
            </h2>
          </div>
        </div>

        {/* Center: Module Navigation Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setCurrentSection('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: currentSection === 'dashboard' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
              color: currentSection === 'dashboard' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: currentSection === 'dashboard' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
              cursor: 'pointer',
            }}
          >
            <LayoutDashboard size={14} /> Dashboard
          </button>

          {canViewOrganizacion && (
            <button
              onClick={() => setCurrentSection('organizacion')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: currentSection === 'organizacion' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                color: currentSection === 'organizacion' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: currentSection === 'organizacion' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              <Network size={14} /> Organización
            </button>
          )}

          {canViewEmpleados && (
            <button
              onClick={() => setCurrentSection('empleados')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: currentSection === 'empleados' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                color: currentSection === 'empleados' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: currentSection === 'empleados' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              <Users size={14} /> Colaboradores
            </button>
          )}

          {canViewAsistencias && (
            <button
              onClick={() => setCurrentSection('asistencias')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: currentSection === 'asistencias' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                color: currentSection === 'asistencias' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: currentSection === 'asistencias' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              <CalendarCheck size={14} /> Auditoría Asistencias
            </button>
          )}

          {canViewSeguridad && (
            <button
              onClick={() => setCurrentSection('seguridad')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: currentSection === 'seguridad' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                color: currentSection === 'seguridad' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: currentSection === 'seguridad' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              <Shield size={14} /> Seguridad & Modelos
            </button>
          )}
        </div>

        {/* Right: Authenticated User Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%)',
                color: '#070a13',
                fontSize: '0.72rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {user.nombre_completo.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                {user.nombre_completo}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{user.rol_codigo}</span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {sedeScope === 'sede' ? user.sede_nombre || 'Sede Asignada' : 'Alcance Global'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Cerrar Sesión Administrativa"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 75, 92, 0.1)',
              border: '1px solid rgba(255, 75, 92, 0.3)',
              color: 'var(--accent-coral)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} />
            <span>SALIR</span>
          </button>
        </div>
      </div>

      {/* Scope Restriction Notification Bar (if user has sede-limited scope) */}
      {sedeScope === 'sede' && (
        <div
          style={{
            padding: '6px 28px',
            background: 'rgba(0, 245, 160, 0.08)',
            borderBottom: '1px solid rgba(0, 245, 160, 0.2)',
            color: 'var(--accent-emerald)',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Building2 size={13} />
          <span>
            POLÍTICA DE ALCANCE ACTIVA: Su rol está restringido a la sede <strong>{user.sede_nombre || 'Local'}</strong>.
            Solo puede visualizar y administrar registros vinculados a esta ubicación.
          </span>
        </div>
      )}

      {/* Main Section Content */}
      <div style={{ flex: 1, padding: '26px 28px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {currentSection === 'dashboard' && <AdminDashboard />}
        {currentSection === 'organizacion' && canViewOrganizacion && <OrganizacionManager />}
        {currentSection === 'empleados' && canViewEmpleados && <EmpleadosManager />}
        {currentSection === 'asistencias' && canViewAsistencias && <AsistenciasAuditoria />}
        {currentSection === 'seguridad' && canViewSeguridad && <SeguridadManager />}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { UserCheck, Delete, ArrowRight, Sparkles } from 'lucide-react';

interface CkpInputProps {
  cedula: string;
  onCedulaChange: (val: string) => void;
  onSubmit: () => void;
  isScanning: boolean;
  cooldownSeconds?: number;
}

const PRESET_EMPLEADOS = [
  { cedula: '22789456', nombre: 'Juan Carlos', depto: 'Estadística' },
  { cedula: '19543210', nombre: 'María R.', depto: 'RRHH' },
  { cedula: '25111222', nombre: 'Carlos M.', depto: 'Informática' },
  { cedula: '99999999', nombre: 'Visitante', depto: 'Recepción' },
];

export const CkpInput: React.FC<CkpInputProps> = ({
  cedula,
  onCedulaChange,
  onSubmit,
  isScanning,
  cooldownSeconds = 0,
}) => {
  const [showKeypad, setShowKeypad] = useState<boolean>(false);

  const handleKeyPress = (num: string) => {
    if (cedula.length < 10) {
      onCedulaChange(cedula + num);
    }
  };

  const handleDelete = () => {
    onCedulaChange(cedula.slice(0, -1));
  };

  const handleClear = () => {
    onCedulaChange('');
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', width: '100%', maxWidth: '520px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <label
          htmlFor="cedula-input"
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <UserCheck size={16} color="var(--accent-cyan)" /> NÚMERO DE CÉDULA / IDENTIFICACIÓN
        </label>

        <button
          onClick={() => setShowKeypad(!showKeypad)}
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(255, 255, 255, 0.06)',
            color: 'var(--accent-cyan)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {showKeypad ? 'Ocultar Teclado' : 'Teclado Táctil'}
        </button>
      </div>

      {/* Main Input Field */}
      <div style={{ position: 'relative', marginBottom: '14px' }}>
        <input
          id="cedula-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={cedula}
          onChange={(e) => onCedulaChange(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && cedula && !isScanning) {
              onSubmit();
            }
          }}
          placeholder="Ej: 22789456"
          disabled={isScanning}
          className="mono"
          style={{
            width: '100%',
            padding: '16px 20px',
            fontSize: '1.4rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textAlign: 'center',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(8, 12, 22, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#ffffff',
          }}
        />

        {cedula && (
          <button
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--text-muted)',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Quick Select Presets for Fast Testing */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <Sparkles size={12} color="var(--accent-amber)" />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            USUARIOS DE PRUEBA RÁPIDA:
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {PRESET_EMPLEADOS.map((emp) => (
            <button
              key={emp.cedula}
              onClick={() => onCedulaChange(emp.cedula)}
              disabled={isScanning}
              style={{
                padding: '6px 4px',
                borderRadius: 'var(--radius-sm)',
                background: cedula === emp.cedula ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: cedula === emp.cedula ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                color: cedula === emp.cedula ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: '0.7rem',
                textAlign: 'center',
              }}
            >
              <div className="mono" style={{ fontWeight: 700 }}>{emp.cedula}</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {emp.nombre}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Touch Screen Keypad (If Enabled) */}
      {showKeypad && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '18px',
            background: 'rgba(8, 12, 22, 0.6)',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((btn) => (
            <button
              key={btn}
              onClick={() => {
                if (btn === 'C') handleClear();
                else if (btn === 'DEL') handleDelete();
                else handleKeyPress(btn);
              }}
              disabled={isScanning}
              style={{
                padding: '14px 0',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: btn === 'C' ? 'var(--accent-coral)' : '#ffffff',
                fontSize: '1.1rem',
                fontWeight: 700,
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {btn === 'DEL' ? <Delete size={20} /> : btn}
            </button>
          ))}
        </div>
      )}

      {/* Primary Submit Button */}
      <button
        onClick={onSubmit}
        disabled={isScanning || !cedula || cooldownSeconds > 0}
        style={{
          width: '100%',
          padding: '18px 24px',
          borderRadius: 'var(--radius-md)',
          background: cooldownSeconds > 0
            ? 'rgba(255, 183, 3, 0.2)'
            : 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
          color: cooldownSeconds > 0 ? 'var(--accent-amber)' : '#070a13',
          fontSize: '1.05rem',
          fontWeight: 800,
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          boxShadow: cooldownSeconds > 0 ? 'none' : '0 4px 20px rgba(0, 242, 254, 0.35)',
          border: cooldownSeconds > 0 ? '1px solid var(--accent-amber)' : 'none',
        }}
      >
        {isScanning ? (
          <>
            <span
              style={{
                width: '20px',
                height: '20px',
                border: '2px solid rgba(0,0,0,0.2)',
                borderTopColor: '#000',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'radarSpin 0.8s linear infinite',
              }}
            />
            <span>VERIFICANDO BIOMETRÍA...</span>
          </>
        ) : cooldownSeconds > 0 ? (
          <span>COOLDOWN ACTIVO ({cooldownSeconds}s)</span>
        ) : (
          <>
            <span>REGISTRAR MARCACIÓN</span>
            <ArrowRight size={20} />
          </>
        )}
      </button>
    </div>
  );
};

import React from 'react';
import {
  Activity,
  BellOff,
  Download,
  Lock,
  Moon,
  ShieldAlert,
  Sparkles,
  Trash2,
  Vibrate,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AppSettings, StressAlertItem } from '../../types';
import { formatRelativeTime } from './WearPrimitives';

interface QuickSettingsShadeProps {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onQuickExport: () => void;
  onClose: () => void;
  onHaptic: () => void;
}

export const QuickSettingsShade: React.FC<QuickSettingsShadeProps> = ({
  settings,
  onUpdateSettings,
  onQuickExport,
  onClose,
  onHaptic,
}) => {
  const toggle = (key: keyof AppSettings) => {
    onHaptic();
    onUpdateSettings({ [key]: !settings[key] } as Partial<AppSettings>);
  };

  const tiles = [
    {
      label: 'AOD',
      active: settings.aodEnabled,
      icon: Moon,
      onClick: () => toggle('aodEnabled'),
    },
    {
      label: settings.audioEnabled ? 'Audio On' : 'Muted',
      active: settings.audioEnabled,
      icon: settings.audioEnabled ? Volume2 : VolumeX,
      onClick: () => toggle('audioEnabled'),
    },
    {
      label: 'Haptics',
      active: settings.hapticsEnabled,
      icon: Vibrate,
      onClick: () => toggle('hapticsEnabled'),
    },
    {
      label: 'Pause Alerts',
      active: settings.dndStressAlerts,
      icon: BellOff,
      onClick: () => toggle('dndStressAlerts'),
    },
    {
      label: 'Export Log',
      active: false,
      icon: Download,
      onClick: () => {
        onHaptic();
        onQuickExport();
      },
    },
    {
      label: 'Close',
      active: false,
      icon: X,
      onClick: onClose,
    },
  ];

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between bg-[#121514]/96 px-9 pb-7 pt-9 backdrop-blur-md">
      <div className="text-center">
        <p className="text-[12px] font-semibold tracking-wide text-[#D1D6D4]">Quick Settings</p>
      </div>

      <div className="grid w-full max-w-[276px] grid-cols-3 gap-2.5">
        {tiles.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-[22px] border py-3 transition-all active:scale-95 ${
                item.active
                  ? 'border-[#63D4A3]/60 bg-[#152920] text-[#63D4A3]'
                  : 'border-[#2C3230] bg-[#1A1F1D] text-[#E5E9E7] hover:bg-[#222826]'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#8FD8B5]">
        <Lock className="h-3.5 w-3.5" />
        <span>100% On-Device Local Vault</span>
      </div>
    </div>
  );
};

interface NotificationsDrawerProps {
  notifications: StressAlertItem[];
  onLaunchPanic: () => void;
  onClearAll: () => void;
  onClose: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  notifications,
  onLaunchPanic,
  onClearAll,
  onClose,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#121514]/96 backdrop-blur-md">
      <div className="flex items-center justify-center pt-7 pb-2">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-full border border-[#2C3230] bg-[#1A1F1D] px-3.5 py-1 text-[11px] font-medium text-[#D1D6D4] hover:bg-[#222826]"
        >
          <X className="h-3.5 w-3.5" />
          <span>Body-Response Feed</span>
        </button>
      </div>

      <div className="wear-scroll flex-1 space-y-2.5 overflow-y-auto px-9 pb-14 pt-2">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Sparkles className="mb-2 h-6 w-6 text-[#63D4A3]" />
            <p className="text-[13px] font-semibold text-[#F4F6F5]">All Clear</p>
            <p className="mt-1 text-[11px] text-[#9CA3A0]">
              No active Pixel Watch stress alerts.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className="rounded-[22px] border border-[#2B312F] bg-[#181C1B] p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[#F4F6F5]">{n.title}</span>
                <span className="font-mono text-[10px] text-[#9CA3A0] tabular-nums">
                  {formatRelativeTime(n.timestamp)}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-[#D1D6D4]">{n.detail}</p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLaunchPanic();
                  }}
                  className="rounded-full border border-[#E89B8C]/45 bg-[#2F1C19] px-3 py-1 text-[11px] font-semibold text-[#E89B8C] active:scale-95"
                >
                  Voice Anchor
                </button>
                <span className="font-mono text-[10px] text-[#9CA3A0] tabular-nums">
                  {n.hr} bpm · cEDA {n.cedaLevel}
                </span>
              </div>
            </div>
          ))
        )}

        {notifications.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="mx-auto flex items-center gap-1.5 rounded-full border border-[#2C3230] bg-[#1A1F1D] px-4 py-2 text-[11px] font-medium text-[#D1D6D4] hover:bg-[#222826]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Feed</span>
          </button>
        )}
      </div>
    </div>
  );
};

interface StressAlertOverlayProps {
  alert: StressAlertItem;
  onLaunchPanic: () => void;
  onOpenGrid: () => void;
  onDismiss: () => void;
}

export const StressAlertOverlay: React.FC<StressAlertOverlayProps> = ({
  alert,
  onLaunchPanic,
  onOpenGrid,
  onDismiss,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#141212]/96 px-9 text-center backdrop-blur-md">
      {/* Perimeter Terracotta Pulse Ring */}
      <div className="animate-panic-beacon pointer-events-none absolute inset-3 rounded-full border-2 border-[#E89B8C]/55" />

      <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-full border border-[#E89B8C]/50 bg-[#2F1C19] text-[#E89B8C]">
        <Activity className="h-6 w-6" />
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#E89B8C]">
        Body-Response Alert
      </p>
      <h3 className="mt-1 text-[18px] font-bold leading-tight text-[#F4F6F5]">
        Elevated Response
      </h3>
      <p className="mt-1 font-mono text-[12px] text-[#D1D6D4] tabular-nums">
        HR {alert.hr} bpm · Take a moment?
      </p>

      <div className="mt-4 flex w-full max-w-[260px] flex-col gap-2">
        <button
          type="button"
          onClick={onLaunchPanic}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-[#E89B8C]/60 bg-[#2F1C19] px-4 text-[13px] font-bold text-[#E89B8C] shadow-lg transition-transform hover:brightness-115 active:scale-95"
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Voice Panic Anchor</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenGrid}
            className="min-h-[40px] rounded-full border border-[#2F3633] bg-[#1C211F] text-[12px] font-semibold text-[#F4F6F5] transition-colors hover:bg-[#252B29] active:scale-95"
          >
            16-Grid Log
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[40px] rounded-full border border-[#2C3230] bg-transparent text-[12px] font-medium text-[#9CA3A0] hover:bg-white/5 active:scale-95"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

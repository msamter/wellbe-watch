import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  BarChart3,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Bell,
  BellOff,
  Bluetooth,
  ChevronRight,
  Download,
  Info,
  Lock,
  Moon,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Vibrate,
  Volume2,
  VolumeX,
  Watch,
  Wifi,
  Wind,
  Zap,
} from 'lucide-react';
import {
  AnchorVoicePreset,
  AppSettings,
  LiveBiometrics,
  StressAlertItem,
  WatchCaseFinish,
} from '../../types';
import { m3Shapes, m3Springs } from '../../styles/m3Tokens';
import { CurvedTimeText, WearScrollColumn, formatRelativeTime } from './WearPrimitives';
import {
  ExpressiveButton,
  ExpressiveChip,
  ExpressiveSegmentButton,
} from './ExpressiveControls';

/* ============================================================================
 * 1. GOOGLE PIXEL WATCH · WEAR OS 5 SETTINGS MENU (Tile Screen BELOW Home)
 *    Swipe UP from Home to open · Swipe DOWN to return to Home
 * ========================================================================== */

interface QuickSettingsShadeProps {
  timeText: string;
  settings: AppSettings;
  biometrics: LiveBiometrics;
  crownDelta: { seq: number; delta: number };
  onScrollReport: (ratio: number, hasOverflow: boolean) => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onToggleCharging: () => void;
  onQuickExport: () => void;
  onClose: () => void;
  onHaptic: (color?: string) => void;
}

type PixelSettingsSection =
  | 'display'
  | 'sound'
  | 'battery'
  | 'connectivity'
  | 'style'
  | 'wellbe'
  | 'system';

const CASE_FINISH_OPTIONS: { id: WatchCaseFinish; label: string; dot: string }[] = [
  { id: 'obsidian', label: 'Obsidian', dot: '#2B303A' },
  { id: 'silver', label: 'Silver', dot: '#CBD5E1' },
  { id: 'champagne', label: 'Gold', dot: '#D6BE92' },
];

const VOICE_OPTIONS: { id: AnchorVoicePreset; label: string }[] = [
  { id: 'tender', label: 'Tender' },
  { id: 'warm', label: 'Warm' },
  { id: 'grounded', label: 'Grounded' },
];

export const QuickSettingsShade: React.FC<QuickSettingsShadeProps> = ({
  timeText,
  settings,
  biometrics,
  crownDelta,
  onScrollReport,
  onUpdateSettings,
  onToggleCharging,
  onQuickExport,
  onClose,
  onHaptic,
}) => {
  const [expanded, setExpanded] = useState<PixelSettingsSection | null>(null);
  const [brightnessPct, setBrightnessPct] = useState<number>(80);
  const [wifiEnabled, setWifiEnabled] = useState<boolean>(true);
  const [btConnected, setBtConnected] = useState<boolean>(true);

  const batteryLevel = Math.max(1, Math.min(100, Math.round(biometrics.batteryLevel ?? 84)));
  const isCharging = Boolean(biometrics.isCharging);

  const BatteryIcon = isCharging
    ? BatteryCharging
    : batteryLevel <= 20
    ? BatteryLow
    : batteryLevel <= 65
    ? BatteryMedium
    : BatteryFull;

  const toggleSetting = (key: keyof AppSettings) => {
    onHaptic('#63D4A3');
    onUpdateSettings({ [key]: !settings[key] } as Partial<AppSettings>);
  };

  const toggleSection = (id: PixelSettingsSection) => {
    onHaptic('#93BBE0');
    setExpanded((prev) => (prev === id ? null : id));
  };

  const quickTiles = [
    {
      id: 'dnd',
      label: settings.dndStressAlerts ? 'DND On' : 'Alerts On',
      active: settings.dndStressAlerts,
      icon: BellOff,
      onClick: () => toggleSetting('dndStressAlerts'),
    },
    {
      id: 'aod',
      label: 'Always-On',
      active: settings.aodEnabled,
      icon: Moon,
      onClick: () => toggleSetting('aodEnabled'),
    },
    {
      id: 'audio',
      label: settings.audioEnabled ? 'Sound On' : 'Muted',
      active: settings.audioEnabled,
      icon: settings.audioEnabled ? Volume2 : VolumeX,
      onClick: () => toggleSetting('audioEnabled'),
    },
    {
      id: 'haptics',
      label: 'Haptics',
      active: settings.hapticsEnabled,
      icon: Vibrate,
      onClick: () => toggleSetting('hapticsEnabled'),
    },
    {
      id: 'battery',
      label: isCharging ? `${batteryLevel}% Chg` : `${batteryLevel}%`,
      active: isCharging,
      icon: BatteryIcon,
      onClick: () => {
        onHaptic('#63D4A3');
        onToggleCharging();
      },
    },
    {
      id: 'export',
      label: 'Export',
      active: false,
      icon: Download,
      onClick: () => {
        onHaptic('#63D4A3');
        onQuickExport();
      },
    },
  ];

  const menuRows: {
    id: PixelSettingsSection;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
  }[] = [
    {
      id: 'display',
      title: 'Display',
      subtitle: `Brightness ${brightnessPct}% · AOD ${settings.aodEnabled ? 'On' : 'Off'}`,
      icon: Sun,
      iconBg: '#332D1F',
      iconColor: '#F0D57B',
    },
    {
      id: 'sound',
      title: 'Sound & Vibration',
      subtitle: `${settings.audioEnabled ? 'Audio On' : 'Muted'} · ${settings.anchorVoice} voice`,
      icon: Volume2,
      iconBg: '#1F3028',
      iconColor: '#A4DCC0',
    },
    {
      id: 'battery',
      title: 'Battery',
      subtitle: `${batteryLevel}% · ${isCharging ? 'Charging on puck' : 'Adaptive Battery'}`,
      icon: BatteryIcon,
      iconBg: '#152920',
      iconColor: '#63D4A3',
    },
    {
      id: 'connectivity',
      title: 'Connectivity',
      subtitle: `${btConnected ? 'Pixel Phone' : 'Standalone'} · ${wifiEnabled ? 'Wi-Fi On' : 'Wi-Fi Off'}`,
      icon: Bluetooth,
      iconBg: '#23303B',
      iconColor: '#B0CCE5',
    },
    {
      id: 'style',
      title: 'Watch Finish',
      subtitle: `${settings.caseFinish.charAt(0).toUpperCase()}${settings.caseFinish.slice(1)} case`,
      icon: Watch,
      iconBg: '#2A2735',
      iconColor: '#C9C0EC',
    },
    {
      id: 'wellbe',
      title: 'WELLBE+ Privacy',
      subtitle: settings.dndStressAlerts ? 'Alerts paused · Local Vault' : 'Alerts active · Local Vault',
      icon: ShieldCheck,
      iconBg: '#1F3028',
      iconColor: '#63D4A3',
    },
    {
      id: 'system',
      title: 'System',
      subtitle: 'Pixel Watch · Wear OS 5',
      icon: Info,
      iconBg: '#24292B',
      iconColor: '#D1D6D4',
    },
  ];

  return (
    <div className="relative flex h-full w-full flex-col bg-[#101312]">
      <CurvedTimeText timeText={timeText} label="Wear OS 5" />

      <WearScrollColumn
        crownDelta={crownDelta}
        onScrollReport={onScrollReport}
        paddingTopClass="pt-[42px]"
        paddingBottomClass="pb-[44px]"
      >
        <div className="flex flex-col gap-2.5">
          {/* Header Title */}
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 text-[#F4F6F5]">
              <Settings className="h-3.5 w-3.5 text-[#93BBE0]" />
              <h2 className="text-[14px] font-bold tracking-tight">Settings</h2>
            </div>
            <p className="mt-0.5 font-mono text-[9.5px] text-[#9CA3A0] tabular-nums">
              {`Pixel Watch · Wear OS 5 · ${batteryLevel}%`}
            </p>
          </div>

          {/* Wear OS 5 Quick Settings 2x3 Control Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {quickTiles.map((item) => {
              const Icon = item.icon;
              return (
                <ExpressiveSegmentButton
                  key={item.id}
                  selected={item.active}
                  selectedBg="#152920"
                  selectedColor="#63D4A3"
                  selectedBorder="rgba(99, 212, 163, 0.6)"
                  idleBg="#181C1B"
                  idleColor="#E5E9E7"
                  idleBorder="#2C3230"
                  selectedRadius={m3Shapes.large}
                  idleRadius={m3Shapes.cardWatch}
                  className="flex-col gap-1 py-2.5"
                  onClick={item.onClick}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[9.5px] font-semibold leading-none">{item.label}</span>
                </ExpressiveSegmentButton>
              );
            })}
          </div>

          {/* Pixel Watch Wear OS 5 Scrollable Settings Categories */}
          <div className="flex flex-col gap-1.5">
            {menuRows.map((row) => {
              const Icon = row.icon;
              const isOpen = expanded === row.id;
              return (
                <div
                  key={row.id}
                  className="overflow-hidden rounded-[22px] border border-[#2B312F] bg-[#181C1B]"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(row.id)}
                    className="flex w-full items-center justify-between gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[#202523]"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: row.iconBg, color: row.iconColor }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-bold text-[#F4F6F5]">{row.title}</p>
                        <p className="truncate text-[9.5px] text-[#9CA3A0]">{row.subtitle}</p>
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-3.5 w-3.5 shrink-0 text-[#7F8885] transition-transform ${
                        isOpen ? 'rotate-90 text-[#63D4A3]' : ''
                      }`}
                    />
                  </button>

                  {/* Inline Expandable Wear OS 5 Sub-Controls */}
                  {isOpen && (
                    <div className="border-t border-white/6 bg-[#131716] px-3 py-2.5 text-[10.5px]">
                      {row.id === 'display' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[#9CA3A0]">Brightness</span>
                            <div className="flex items-center gap-1">
                              {[50, 80, 100].map((lvl) => (
                                <ExpressiveChip
                                  key={lvl}
                                  label={`${lvl}%`}
                                  selected={brightnessPct === lvl}
                                  size="xs"
                                  selectedSurface="#332D1F"
                                  selectedBorder="rgba(240, 213, 123, 0.55)"
                                  accentColor="#F0D57B"
                                  className="font-mono"
                                  onClick={() => {
                                    onHaptic('#F0D57B');
                                    setBrightnessPct(lvl);
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <ExpressiveSegmentButton
                            selected={settings.aodEnabled}
                            selectedBg="#152920"
                            selectedColor="#E5E9E7"
                            selectedBorder="rgba(99, 212, 163, 0.45)"
                            idleBg="#1A1F1D"
                            idleColor="#E5E9E7"
                            idleBorder="transparent"
                            selectedRadius="12px"
                            idleRadius="999px"
                            className="w-full justify-between px-3 py-1.5 text-[10.5px]"
                            onClick={() => toggleSetting('aodEnabled')}
                          >
                            <span>Always-On Screen</span>
                            <span className={settings.aodEnabled ? 'text-[#63D4A3]' : 'text-[#9CA3A0]'}>
                              {settings.aodEnabled ? 'On' : 'Off'}
                            </span>
                          </ExpressiveSegmentButton>
                        </div>
                      )}

                      {row.id === 'sound' && (
                        <div className="space-y-2">
                          <div className="flex gap-1.5">
                            <ExpressiveSegmentButton
                              selected={settings.audioEnabled}
                              selectedBg="#152920"
                              selectedColor="#63D4A3"
                              selectedBorder="rgba(99, 212, 163, 0.5)"
                              idleBg="#1E2321"
                              idleColor="#9CA3A0"
                              idleBorder="transparent"
                              selectedRadius="12px"
                              idleRadius="999px"
                              className="flex-1 py-1.5 text-[10.5px]"
                              onClick={() => toggleSetting('audioEnabled')}
                            >
                              {settings.audioEnabled ? 'Audio On' : 'Muted'}
                            </ExpressiveSegmentButton>
                            <ExpressiveSegmentButton
                              selected={settings.hapticsEnabled}
                              selectedBg="#152920"
                              selectedColor="#63D4A3"
                              selectedBorder="rgba(99, 212, 163, 0.5)"
                              idleBg="#1E2321"
                              idleColor="#9CA3A0"
                              idleBorder="transparent"
                              selectedRadius="12px"
                              idleRadius="999px"
                              className="flex-1 py-1.5 text-[10.5px]"
                              onClick={() => toggleSetting('hapticsEnabled')}
                            >
                              {settings.hapticsEnabled ? 'Haptics On' : 'Haptics Off'}
                            </ExpressiveSegmentButton>
                          </div>
                          <div>
                            <p className="mb-1 text-[9.5px] text-[#9CA3A0]">Anchor Voice Tone</p>
                            <div className="grid grid-cols-3 gap-1">
                              {VOICE_OPTIONS.map((v) => (
                                <ExpressiveSegmentButton
                                  key={v.id}
                                  selected={settings.anchorVoice === v.id}
                                  selectedBg="#152920"
                                  selectedColor="#63D4A3"
                                  selectedBorder="rgba(99, 212, 163, 0.5)"
                                  idleBg="#1E2321"
                                  idleColor="#9CA3A0"
                                  idleBorder="transparent"
                                  selectedRadius="10px"
                                  idleRadius="999px"
                                  className="py-1 text-[10px]"
                                  onClick={() => {
                                    onHaptic('#63D4A3');
                                    onUpdateSettings({ anchorVoice: v.id });
                                  }}
                                >
                                  {v.label}
                                </ExpressiveSegmentButton>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {row.id === 'battery' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between font-mono text-[10.5px] tabular-nums">
                            <span className="text-[#9CA3A0]">Charge Level</span>
                            <span className="font-bold text-[#63D4A3]">{batteryLevel}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#242A27]">
                            <div
                              className="h-full rounded-full bg-[#63D4A3] transition-all"
                              style={{ width: `${batteryLevel}%` }}
                            />
                          </div>
                          <ExpressiveButton
                            variant="tonal"
                            size="xs"
                            fullWidth
                            selected={isCharging}
                            surfaceColor="#152920"
                            accentColor="#63D4A3"
                            borderColor="rgba(99, 212, 163, 0.45)"
                            leadingIcon={<Zap className="h-3 w-3" />}
                            onClick={() => {
                              onHaptic('#63D4A3');
                              onToggleCharging();
                            }}
                          >
                            {isCharging ? 'Stop Charging Sim' : 'Simulate Charger'}
                          </ExpressiveButton>
                        </div>
                      )}

                      {row.id === 'connectivity' && (
                        <div className="flex gap-1.5">
                          <ExpressiveSegmentButton
                            selected={btConnected}
                            selectedBg="#23303B"
                            selectedColor="#B0CCE5"
                            selectedBorder="rgba(176, 204, 229, 0.45)"
                            idleBg="#1E2321"
                            idleColor="#9CA3A0"
                            idleBorder="transparent"
                            selectedRadius="12px"
                            idleRadius="999px"
                            className="flex-1 gap-1 py-1.5 text-[10.5px]"
                            onClick={() => {
                              onHaptic('#93BBE0');
                              setBtConnected((v) => !v);
                            }}
                          >
                            <Bluetooth className="h-3 w-3" />
                            <span>{btConnected ? 'Paired' : 'Off'}</span>
                          </ExpressiveSegmentButton>
                          <ExpressiveSegmentButton
                            selected={wifiEnabled}
                            selectedBg="#23303B"
                            selectedColor="#B0CCE5"
                            selectedBorder="rgba(176, 204, 229, 0.45)"
                            idleBg="#1E2321"
                            idleColor="#9CA3A0"
                            idleBorder="transparent"
                            selectedRadius="12px"
                            idleRadius="999px"
                            className="flex-1 gap-1 py-1.5 text-[10.5px]"
                            onClick={() => {
                              onHaptic('#93BBE0');
                              setWifiEnabled((v) => !v);
                            }}
                          >
                            <Wifi className="h-3 w-3" />
                            <span>{wifiEnabled ? 'Wi-Fi' : 'Off'}</span>
                          </ExpressiveSegmentButton>
                        </div>
                      )}

                      {row.id === 'style' && (
                        <div className="grid grid-cols-3 gap-1">
                          {CASE_FINISH_OPTIONS.map((fin) => (
                            <ExpressiveChip
                              key={fin.id}
                              label={fin.label}
                              selected={settings.caseFinish === fin.id}
                              size="xs"
                              leadingDotColor={fin.dot}
                              className="w-full"
                              onClick={() => {
                                onHaptic();
                                onUpdateSettings({ caseFinish: fin.id });
                              }}
                            />
                          ))}
                        </div>
                      )}

                      {row.id === 'wellbe' && (
                        <div className="space-y-1.5">
                          <ExpressiveSegmentButton
                            selected={!settings.dndStressAlerts}
                            selectedBg="#152920"
                            selectedColor="#E5E9E7"
                            selectedBorder="rgba(99, 212, 163, 0.45)"
                            idleBg="#1A1F1D"
                            idleColor="#E5E9E7"
                            idleBorder="transparent"
                            selectedRadius="12px"
                            idleRadius="999px"
                            className="w-full justify-between px-3 py-1.5 text-[10.5px]"
                            onClick={() => toggleSetting('dndStressAlerts')}
                          >
                            <span>Body-Response Alerts</span>
                            <span
                              className={
                                settings.dndStressAlerts ? 'text-[#9CA3A0]' : 'text-[#63D4A3]'
                              }
                            >
                              {settings.dndStressAlerts ? 'Paused' : 'Active'}
                            </span>
                          </ExpressiveSegmentButton>
                          <ExpressiveButton
                            variant="tonal"
                            size="xs"
                            fullWidth
                            surfaceColor="#152920"
                            accentColor="#63D4A3"
                            borderColor="rgba(99, 212, 163, 0.45)"
                            leadingIcon={<Download className="h-3 w-3" />}
                            onClick={() => {
                              onHaptic('#63D4A3');
                              onQuickExport();
                            }}
                          >
                            Export Local Vault (.json)
                          </ExpressiveButton>
                        </div>
                      )}

                      {row.id === 'system' && (
                        <div className="space-y-1 font-mono text-[9.5px] text-[#9CA3A0]">
                          <p className="text-[#E5E9E7]">Google Pixel Watch · Wear OS 5</p>
                          <p>App: WELLBE+ Watch</p>
                          <p className="inline-flex items-center gap-1 text-[#63D4A3]">
                            <Lock className="h-2.5 w-2.5" />
                            <span>100% On-Device Local Vault</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </WearScrollColumn>
    </div>
  );
};

/* ============================================================================
 * 2. NOTIFICATIONS TILE SCREEN (Tile Screen ABOVE Home)
 *    Swipe DOWN from Home to open · Swipe UP to return to Home
 * ========================================================================== */

interface NotificationsDrawerProps {
  timeText: string;
  notifications: StressAlertItem[];
  crownDelta: { seq: number; delta: number };
  onScrollReport: (ratio: number, hasOverflow: boolean) => void;
  onLaunchPanic: () => void;
  onOpenEmotions: () => void;
  onOpenRoutines: () => void;
  onOpenTrends: () => void;
  onClearAll: () => void;
  onClose: () => void;
  onHaptic: (color?: string) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  timeText,
  notifications,
  crownDelta,
  onScrollReport,
  onLaunchPanic,
  onOpenEmotions,
  onOpenRoutines,
  onOpenTrends,
  onClearAll,
  onClose,
  onHaptic,
}) => {
  const handleAction = (n: StressAlertItem) => {
    onClose();
    if (n.actionTarget === 'emotions') {
      onHaptic('#F0D57B');
      onOpenEmotions();
    } else if (n.actionTarget === 'routines') {
      onHaptic('#63D4A3');
      onOpenRoutines();
    } else if (n.actionTarget === 'trends') {
      onHaptic('#93BBE0');
      onOpenTrends();
    } else {
      onHaptic('#F0B0A3');
      onLaunchPanic();
    }
  };

  const getVisuals = (n: StressAlertItem) => {
    switch (n.category) {
      case 'wellbe-routine':
        return {
          icon: Wind,
          bg: '#152920',
          accent: '#63D4A3',
          btnBg: '#152920',
          btnBorder: '#3F6352',
          btnText: '#A4DCC0',
        };
      case 'wellbe-checkin':
        return {
          icon: Sun,
          bg: '#332D1F',
          accent: '#F0D57B',
          btnBg: '#332D1F',
          btnBorder: '#685B3A',
          btnText: '#F0D57B',
        };
      case 'wellbe-insight':
        return {
          icon: BarChart3,
          bg: '#23303B',
          accent: '#B0CCE5',
          btnBg: '#23303B',
          btnBorder: '#495F74',
          btnText: '#B0CCE5',
        };
      default:
        return {
          icon: Activity,
          bg: '#2F1C19',
          accent: '#E89B8C',
          btnBg: '#2F1C19',
          btnBorder: 'rgba(232, 155, 140, 0.45)',
          btnText: '#E89B8C',
        };
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-[#101312]">
      <CurvedTimeText timeText={timeText} label="Notifications" />

      <WearScrollColumn
        crownDelta={crownDelta}
        onScrollReport={onScrollReport}
        paddingTopClass="pt-[42px]"
        paddingBottomClass="pb-[44px]"
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 text-[#F4F6F5]">
              <Bell className="h-3.5 w-3.5 text-[#E8C96D]" />
              <h2 className="text-[13.5px] font-bold tracking-tight">Notifications</h2>
            </div>
            <p className="mt-0.5 font-mono text-[9.5px] text-[#9CA3A0] tabular-nums">
              {notifications.length === 0
                ? 'All caught up'
                : `${notifications.length} from WELLBE+`}
            </p>
          </div>

          {notifications.length === 0 ? (
            <div className="mt-2 flex flex-col items-center justify-center rounded-[22px] border border-[#2B312F] bg-[#181C1B] px-4 py-8 text-center">
              <Sparkles className="mb-2 h-6 w-6 text-[#63D4A3]" />
              <p className="text-[13px] font-semibold text-[#F4F6F5]">Quiet &amp; Clear</p>
              <p className="mt-1 text-[10.5px] leading-snug text-[#9CA3A0]">
                No pending WELLBE+ alerts or routine reminders.
              </p>
            </div>
          ) : (
            notifications.map((n, idx) => {
              const vis = getVisuals(n);
              const Icon = vis.icon;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ ...m3Springs.defaultSpatial, delay: Math.min(idx * 0.04, 0.2) }}
                  className="rounded-[22px] border border-[#2B312F] bg-[#181C1B] p-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center"
                      style={{
                        clipPath: m3Shapes.cookie8,
                        backgroundColor: vis.bg,
                        color: vis.accent,
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-[9.5px] font-bold tracking-wide"
                          style={{ color: vis.accent }}
                        >
                          {n.appName || 'WELLBE+'}
                        </span>
                        <span className="font-mono text-[9.5px] text-[#9CA3A0] tabular-nums">
                          {formatRelativeTime(n.timestamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12px] font-bold leading-tight text-[#F4F6F5]">
                        {n.title}
                      </p>
                      <p className="mt-1 text-[10.5px] leading-snug text-[#D1D6D4]">{n.detail}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <ExpressiveButton
                          variant="tonal"
                          size="xs"
                          surfaceColor={vis.btnBg}
                          accentColor={vis.btnText}
                          borderColor={vis.btnBorder}
                          onClick={() => handleAction(n)}
                        >
                          {n.actionLabel || 'Voice Anchor'}
                        </ExpressiveButton>
                        {typeof n.hr === 'number' && (
                          <span className="font-mono text-[9.5px] text-[#9CA3A0] tabular-nums">
                            {`${n.hr} bpm${n.cedaLevel ? ` · ${n.cedaLevel}` : ''}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}

          {notifications.length > 0 && (
            <ExpressiveButton
              variant="outlined"
              size="xs"
              leadingIcon={<Trash2 className="h-3 w-3" />}
              className="mx-auto mt-1"
              onClick={() => {
                onHaptic();
                onClearAll();
              }}
            >
              Clear All
            </ExpressiveButton>
          )}
        </div>
      </WearScrollColumn>
    </div>
  );
};

/* ============================================================================
 * 3. ELEVATED BODY-RESPONSE ALERT OVERLAY
 * ========================================================================== */

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
        {`HR ${alert.hr ?? 104} bpm · Take a moment?`}
      </p>

      <div className="mt-4 flex w-full max-w-[260px] flex-col gap-2">
        <ExpressiveButton
          variant="danger"
          size="md"
          fullWidth
          leadingIcon={<ShieldAlert className="h-4 w-4" />}
          className="font-bold shadow-lg"
          onClick={onLaunchPanic}
        >
          Voice Panic Anchor
        </ExpressiveButton>

        <div className="grid grid-cols-2 gap-2">
          <ExpressiveButton
            variant="outlined"
            size="md"
            fullWidth
            onClick={onOpenGrid}
          >
            16-Grid Log
          </ExpressiveButton>
          <ExpressiveButton
            variant="text"
            size="md"
            fullWidth
            borderColor="#2C3230"
            onClick={onDismiss}
          >
            Dismiss
          </ExpressiveButton>
        </div>
      </div>
    </div>
  );
};

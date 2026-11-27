import React, { useState } from 'react';
import {
  Activity,
  FileJson,
  FileSpreadsheet,
  FileText,
  Moon,
  Play,
  RefreshCw,
  RotateCcw,
  Sun,
  Vibrate,
  Volume2,
  VolumeX,
  Watch,
  X,
  Zap,
} from 'lucide-react';
import {
  AnchorVoicePreset,
  AppSettings,
  LiveBiometrics,
  TILES,
  TileId,
  WatchCaseFinish,
} from '../../types';
import { ExpressiveMorphLoader } from '../watch/ExpressiveLoaders';
import {
  ExpressiveButton,
  ExpressiveChip,
  ExpressiveIconButton,
  ExpressiveSegmentButton,
} from '../watch/ExpressiveControls';
import { previewAnchorVoice, setAnchorVoicePreset } from '../../utils/audioHaptics';

interface CompanionPanelProps {
  open: boolean;
  onClose: () => void;
  activeTile: TileId;
  onSelectTile: (tile: TileId) => void;
  biometrics: LiveBiometrics;
  settings: AppSettings;
  exportFlashSeq: number;
  onUpdateBiometrics: (
    patch: Partial<
      Pick<
        LiveBiometrics,
        'hr' | 'hrv' | 'sleepHours' | 'cedaLevel' | 'batteryLevel' | 'isCharging'
      >
    >
  ) => void;
  onTriggerStressSpike: () => void;
  onSyncWatch: () => void;
  isSyncing: boolean;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onOpenTherapistModal: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onExportMarkdown: () => void;
  onResetDemoData: () => void;
}

const CASE_FINISHES: { id: WatchCaseFinish; label: string; swatch: string }[] = [
  { id: 'obsidian', label: 'Obsidian', swatch: '#22262E' },
  { id: 'silver', label: 'Silver', swatch: '#CBD5E1' },
  { id: 'champagne', label: 'Gold', swatch: '#D6BE92' },
];

const ANCHOR_VOICE_PRESETS: { id: AnchorVoicePreset; label: string }[] = [
  { id: 'tender', label: 'Tender' },
  { id: 'warm', label: 'Warm' },
  { id: 'grounded', label: 'Grounded' },
];

export const CompanionPanel: React.FC<CompanionPanelProps> = React.memo(({
  open,
  onClose,
  activeTile,
  onSelectTile,
  biometrics,
  settings,
  exportFlashSeq,
  onUpdateBiometrics,
  onTriggerStressSpike,
  onSyncWatch,
  isSyncing,
  onUpdateSettings,
  onOpenTherapistModal,
  onExportJSON,
  onExportCSV,
  onExportMarkdown,
  onResetDemoData,
}) => {
  const [voicePreviewStatus, setVoicePreviewStatus] = useState<string | null>(null);
  if (!open) return null;
  const activeVoice: AnchorVoicePreset = settings.anchorVoice || 'tender';

  return (
    <aside
      aria-label="Companion Studio Panel"
      className="no-print flex w-full max-w-[360px] flex-col rounded-2xl border border-white/10 bg-[#1B1919]/92 p-5 text-[#F5F4F2] shadow-2xl backdrop-blur-xl min-[920px]:max-h-[calc(100dvh-96px)]"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 pb-3.5">
        <div>
          <h2 className="text-sm font-bold text-[#F5F4F2]">Companion Studio</h2>
          <p className="text-xs text-[#A8A4A4]">Pixel Watch 3 · Telemetry &amp; Export</p>
        </div>
        <ExpressiveIconButton
          variant="outlined"
          size={32}
          ariaLabel="Collapse Companion Studio Panel"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </ExpressiveIconButton>
      </div>

      <div className="no-scrollbar mt-4 space-y-5 min-[920px]:min-h-0 min-[920px]:flex-1 min-[920px]:overflow-y-auto min-[920px]:overscroll-contain">
        {/* 1. Pixel Watch Telemetry Simulator */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-[#E5E9E7]">Telemetry Simulator</h3>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-[#63D4A3] tabular-nums">
                Readiness {biometrics.readiness}
              </span>
              <ExpressiveButton
                variant="tonal"
                size="xs"
                surfaceColor="#152920"
                accentColor="#63D4A3"
                borderColor="rgba(99, 212, 163, 0.45)"
                leadingIcon={
                  isSyncing ? (
                    <ExpressiveMorphLoader size={16} label="Syncing watch" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )
                }
                onClick={onSyncWatch}
              >
                {isSyncing ? 'Syncing' : 'Sync'}
              </ExpressiveButton>
            </div>
          </div>

          {/* Heart Rate */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-[#9CA3A0]">Heart Rate</span>
              <span className="font-mono font-semibold text-[#F4F6F5] tabular-nums">
                {biometrics.hr} bpm
              </span>
            </div>
            <input
              type="range"
              min={52}
              max={145}
              value={biometrics.hr}
              onChange={(e) => onUpdateBiometrics({ hr: Number(e.target.value) })}
              className="studio-slider w-full"
            />
          </div>

          {/* HRV */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-[#9CA3A0]">HRV (rMSSD)</span>
              <span className="font-mono font-semibold text-[#63D4A3] tabular-nums">
                {biometrics.hrv} ms
              </span>
            </div>
            <input
              type="range"
              min={18}
              max={95}
              value={biometrics.hrv}
              onChange={(e) => onUpdateBiometrics({ hrv: Number(e.target.value) })}
              className="studio-slider w-full"
            />
          </div>

          {/* Sleep */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-[#9CA3A0]">Last Night&apos;s Sleep</span>
              <span className="font-mono font-semibold text-[#93BBE0] tabular-nums">
                {biometrics.sleepHours.toFixed(1)} hrs
              </span>
            </div>
            <input
              type="range"
              min={4.0}
              max={9.5}
              step={0.1}
              value={biometrics.sleepHours}
              onChange={(e) => onUpdateBiometrics({ sleepHours: Number(e.target.value) })}
              className="studio-slider w-full"
            />
          </div>

          {/* cEDA Body Response Segmented Control */}
          <div>
            <p className="mb-1.5 text-xs text-[#9CA3A0]">cEDA Body Response</p>
            <div className="grid grid-cols-3 gap-1 rounded-full border border-[#2B312F] bg-[#121514] p-1">
              {(['calm', 'moderate', 'elevated'] as const).map((level) => {
                const active = biometrics.cedaLevel === level;
                const selBg =
                  level === 'elevated'
                    ? '#E89B8C'
                    : level === 'moderate'
                    ? '#E8C96D'
                    : '#63D4A3';
                const selFg =
                  level === 'elevated'
                    ? '#1D0F0D'
                    : level === 'moderate'
                    ? '#1B170A'
                    : '#0B1A13';
                return (
                  <ExpressiveSegmentButton
                    key={level}
                    selected={active}
                    selectedBg={selBg}
                    selectedColor={selFg}
                    selectedBorder="transparent"
                    idleBg="transparent"
                    idleColor="#9CA3A0"
                    selectedRadius="10px"
                    idleRadius="999px"
                    className="py-1.5 text-xs capitalize"
                    onClick={() => onUpdateBiometrics({ cedaLevel: level })}
                  >
                    {level}
                  </ExpressiveSegmentButton>
                );
              })}
            </div>
          </div>

          {/* Watch Battery & Charging */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-[#9CA3A0]">Watch Battery</span>
              <div className="flex items-center gap-2">
                <ExpressiveChip
                  label={biometrics.isCharging ? 'Charging' : 'Unplugged'}
                  selected={Boolean(biometrics.isCharging)}
                  size="xs"
                  icon={
                    <Zap
                      className={`h-2.5 w-2.5 ${
                        biometrics.isCharging ? 'fill-[#63D4A3] text-[#63D4A3]' : ''
                      }`}
                    />
                  }
                  onClick={() => onUpdateBiometrics({ isCharging: !biometrics.isCharging })}
                />
                <span
                  className="font-mono font-semibold tabular-nums"
                  style={{
                    color: biometrics.isCharging
                      ? '#63D4A3'
                      : (biometrics.batteryLevel ?? 84) <= 20
                      ? '#F0B0A3'
                      : (biometrics.batteryLevel ?? 84) <= 45
                      ? '#E8C96D'
                      : '#A4DCC0',
                  }}
                >
                  {biometrics.batteryLevel ?? 84}%
                </span>
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={biometrics.batteryLevel ?? 84}
              onChange={(e) => onUpdateBiometrics({ batteryLevel: Number(e.target.value) })}
              className="studio-slider w-full"
            />
          </div>

          {/* 1-Tap Simulate Stress Spike */}
          <ExpressiveButton
            variant="danger"
            size="md"
            fullWidth
            leadingIcon={<Activity className="h-4 w-4 text-[#E89B8C]" />}
            onClick={onTriggerStressSpike}
          >
            Simulate Stress Spike
          </ExpressiveButton>
        </section>

        {/* 2. One-Page Therapist Summary & Exports */}
        <section
          className={`space-y-2.5 border-t border-[#2B312F] pt-4 transition-colors ${
            exportFlashSeq > 0 ? 'rounded-xl ring-1 ring-[#63D4A3]/50 p-2.5 -mx-2.5 bg-[#152920]/40' : ''
          }`}
        >
          <h3 className="text-xs font-semibold text-[#E5E9E7]">
            Therapist Summary &amp; Export
          </h3>
          <ExpressiveButton
            variant="filled"
            size="md"
            fullWidth
            leadingIcon={<FileText className="h-4 w-4" />}
            className="font-bold"
            onClick={onOpenTherapistModal}
          >
            Open 1-Page Therapist Summary
          </ExpressiveButton>

          <div className="grid grid-cols-3 gap-1.5">
            <ExpressiveButton
              variant="tonal"
              size="sm"
              fullWidth
              leadingIcon={<FileJson className="h-3.5 w-3.5 text-[#9CA3A0]" />}
              onClick={onExportJSON}
            >
              .json
            </ExpressiveButton>
            <ExpressiveButton
              variant="tonal"
              size="sm"
              fullWidth
              leadingIcon={<FileSpreadsheet className="h-3.5 w-3.5 text-[#9CA3A0]" />}
              onClick={onExportCSV}
            >
              .csv
            </ExpressiveButton>
            <ExpressiveButton
              variant="tonal"
              size="sm"
              fullWidth
              leadingIcon={<FileText className="h-3.5 w-3.5 text-[#9CA3A0]" />}
              onClick={onExportMarkdown}
            >
              .md
            </ExpressiveButton>
          </div>
        </section>

        {/* 3. Hardware & Demo Controls */}
        <section className="space-y-3 border-t border-[#2B312F] pt-4">
          <h3 className="text-xs font-semibold text-[#E5E9E7]">Hardware &amp; Demo Controls</h3>

          {/* Case Finish */}
          <div className="grid grid-cols-3 gap-1.5">
            {CASE_FINISHES.map((fin) => {
              const active = settings.caseFinish === fin.id;
              return (
                <ExpressiveChip
                  key={fin.id}
                  label={fin.label}
                  selected={active}
                  size="sm"
                  leadingDotColor={fin.swatch}
                  accentColor="#F4F6F5"
                  className="w-full"
                  onClick={() => onUpdateSettings({ caseFinish: fin.id })}
                />
              );
            })}
          </div>

          {/* Hardware Toggles */}
          <div className="grid grid-cols-3 gap-1.5">
            <ExpressiveSegmentButton
              selected={settings.aodEnabled}
              selectedBg="#152920"
              selectedColor="#63D4A3"
              selectedBorder="rgba(99, 212, 163, 0.6)"
              idleBg="#1E2321"
              idleColor="#D1D6D4"
              idleBorder="#2E3532"
              selectedRadius="12px"
              idleRadius="18px"
              className="flex-col gap-1 py-2 text-[11px]"
              onClick={() => onUpdateSettings({ aodEnabled: !settings.aodEnabled })}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>AOD</span>
            </ExpressiveSegmentButton>

            <ExpressiveSegmentButton
              selected={settings.audioEnabled}
              selectedBg="#152920"
              selectedColor="#63D4A3"
              selectedBorder="rgba(99, 212, 163, 0.6)"
              idleBg="#1E2321"
              idleColor="#D1D6D4"
              idleBorder="#2E3532"
              selectedRadius="12px"
              idleRadius="18px"
              className="flex-col gap-1 py-2 text-[11px]"
              onClick={() => onUpdateSettings({ audioEnabled: !settings.audioEnabled })}
            >
              {settings.audioEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              <span>Audio</span>
            </ExpressiveSegmentButton>

            <ExpressiveSegmentButton
              selected={settings.hapticsEnabled}
              selectedBg="#152920"
              selectedColor="#63D4A3"
              selectedBorder="rgba(99, 212, 163, 0.6)"
              idleBg="#1E2321"
              idleColor="#D1D6D4"
              idleBorder="#2E3532"
              selectedRadius="12px"
              idleRadius="18px"
              className="flex-col gap-1 py-2 text-[11px]"
              onClick={() => onUpdateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
            >
              <Vibrate className="h-3.5 w-3.5" />
              <span>Haptics</span>
            </ExpressiveSegmentButton>
          </div>

          {/* Anchor Voice Tone & Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#9CA3A0]">Anchor Voice Tone</p>
              <ExpressiveButton
                variant="tonal"
                size="xs"
                surfaceColor="#152920"
                accentColor="#63D4A3"
                borderColor="rgba(99, 212, 163, 0.45)"
                leadingIcon={<Play className="h-2.5 w-2.5" />}
                onClick={() => previewAnchorVoice(activeVoice, setVoicePreviewStatus)}
              >
                Preview
              </ExpressiveButton>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {ANCHOR_VOICE_PRESETS.map((preset) => {
                const active = activeVoice === preset.id;
                return (
                  <ExpressiveSegmentButton
                    key={preset.id}
                    selected={active}
                    selectedBg="#152920"
                    selectedColor="#F4F6F5"
                    selectedBorder="#63D4A3"
                    idleBg="#1E2321"
                    idleColor="#D1D6D4"
                    idleBorder="#2E3532"
                    selectedRadius="10px"
                    idleRadius="999px"
                    className="py-1.5 text-xs"
                    onClick={() => {
                      setAnchorVoicePreset(preset.id);
                      onUpdateSettings({ anchorVoice: preset.id });
                      previewAnchorVoice(preset.id, setVoicePreviewStatus);
                    }}
                  >
                    {preset.label}
                  </ExpressiveSegmentButton>
                );
              })}
            </div>
            {voicePreviewStatus && (
              <p className="text-[10.5px] leading-snug text-[#E89B8C]">{voicePreviewStatus}</p>
            )}
          </div>

          {/* Direct Jump to Watch Screens */}
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs text-[#9CA3A0]">
              <Watch className="h-3.5 w-3.5" />
              <span>Jump to Watch Screen</span>
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {TILES.map((t) => {
                const active = t.id === activeTile;
                const isAnchor = t.id === 5;
                return (
                  <ExpressiveSegmentButton
                    key={t.id}
                    selected={active}
                    selectedBg={isAnchor ? '#2A1B19' : '#152920'}
                    selectedColor={isAnchor ? '#F0B0A3' : '#63D4A3'}
                    selectedBorder={isAnchor ? '#E89B8C' : '#63D4A3'}
                    idleBg={isAnchor ? '#1D1615' : '#1E2321'}
                    idleColor={isAnchor ? '#E89B8C' : '#D1D6D4'}
                    idleBorder={isAnchor ? '#4D302B' : '#2E3532'}
                    selectedRadius="10px"
                    idleRadius="999px"
                    className="px-1.5 py-1.5 text-[10.5px] whitespace-nowrap"
                    onClick={() => onSelectTile(t.id)}
                  >
                    {t.shortName}
                  </ExpressiveSegmentButton>
                );
              })}
            </div>
          </div>

          {/* Reset 30-Day Seed Data */}
          <div className="flex items-center justify-between pt-1">
            <span className="flex items-center gap-1 text-[11px] text-[#9CA3A0]">
              <Sun className="h-3 w-3 text-[#F0D57B]" />
              Space = Emotions
            </span>
            <ExpressiveButton
              variant="text"
              size="xs"
              leadingIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={onResetDemoData}
            >
              Reset 30D Data
            </ExpressiveButton>
          </div>
        </section>
      </div>
    </aside>
  );
});

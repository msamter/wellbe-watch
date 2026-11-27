import React, { useState } from 'react';
import {
  Activity,
  FileJson,
  FileSpreadsheet,
  FileText,
  Moon,
  Play,
  RotateCcw,
  Sun,
  Vibrate,
  Volume2,
  VolumeX,
  Watch,
  X,
} from 'lucide-react';
import {
  AnchorVoicePreset,
  AppSettings,
  LiveBiometrics,
  TILES,
  TileId,
  WatchCaseFinish,
} from '../../types';
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
    patch: Partial<Pick<LiveBiometrics, 'hr' | 'hrv' | 'sleepHours' | 'cedaLevel'>>
  ) => void;
  onTriggerStressSpike: () => void;
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

export const CompanionPanel: React.FC<CompanionPanelProps> = ({
  open,
  onClose,
  activeTile,
  onSelectTile,
  biometrics,
  settings,
  exportFlashSeq,
  onUpdateBiometrics,
  onTriggerStressSpike,
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
        <button
          type="button"
          onClick={onClose}
          aria-label="Collapse Companion Studio Panel"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-[#252222] text-[#A8A4A4] hover:bg-[#312E2E] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="no-scrollbar mt-4 space-y-5 min-[920px]:min-h-0 min-[920px]:flex-1 min-[920px]:overflow-y-auto min-[920px]:overscroll-contain">
        {/* 1. Pixel Watch Telemetry Simulator */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[#E5E9E7]">Telemetry Simulator</h3>
            <span className="font-mono text-[11px] text-[#63D4A3] tabular-nums">
              Readiness {biometrics.readiness}
            </span>
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
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-[#2B312F] bg-[#121514] p-1">
              {(['calm', 'moderate', 'elevated'] as const).map((level) => {
                const active = biometrics.cedaLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onUpdateBiometrics({ cedaLevel: level })}
                    className={`rounded-md py-1.5 text-xs font-semibold capitalize transition-colors ${
                      active
                        ? level === 'elevated'
                          ? 'bg-[#E89B8C] text-[#1D0F0D]'
                          : level === 'moderate'
                          ? 'bg-[#E8C96D] text-[#1B170A]'
                          : 'bg-[#63D4A3] text-[#0B1A13]'
                        : 'text-[#9CA3A0] hover:text-white'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1-Tap Simulate Stress Spike */}
          <button
            type="button"
            onClick={onTriggerStressSpike}
            className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-[#E89B8C]/45 bg-[#2F1C19] px-4 text-xs font-semibold text-[#E89B8C] transition-colors hover:brightness-115 active:scale-[0.98]"
          >
            <Activity className="h-4 w-4 text-[#E89B8C]" />
            <span>Simulate Stress Spike</span>
          </button>
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
          <button
            type="button"
            onClick={onOpenTherapistModal}
            className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-[#63D4A3] px-4 text-xs font-bold text-[#0B1A13] transition-colors hover:bg-[#76DDB0] active:scale-[0.98]"
          >
            <FileText className="h-4 w-4" />
            <span>Open 1-Page Therapist Summary</span>
          </button>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={onExportJSON}
              className="flex min-h-[34px] items-center justify-center gap-1 rounded-lg border border-[#2E3532] bg-[#1E2321] text-xs font-medium text-[#E5E9E7] hover:bg-[#262C2A]"
            >
              <FileJson className="h-3.5 w-3.5 text-[#9CA3A0]" />
              <span>.json</span>
            </button>
            <button
              type="button"
              onClick={onExportCSV}
              className="flex min-h-[34px] items-center justify-center gap-1 rounded-lg border border-[#2E3532] bg-[#1E2321] text-xs font-medium text-[#E5E9E7] hover:bg-[#262C2A]"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#9CA3A0]" />
              <span>.csv</span>
            </button>
            <button
              type="button"
              onClick={onExportMarkdown}
              className="flex min-h-[34px] items-center justify-center gap-1 rounded-lg border border-[#2E3532] bg-[#1E2321] text-xs font-medium text-[#E5E9E7] hover:bg-[#262C2A]"
            >
              <FileText className="h-3.5 w-3.5 text-[#9CA3A0]" />
              <span>.md</span>
            </button>
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
                <button
                  key={fin.id}
                  type="button"
                  onClick={() => onUpdateSettings({ caseFinish: fin.id })}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'border-[#63D4A3] bg-[#152920] text-[#F4F6F5]'
                      : 'border-[#2E3532] bg-[#1E2321] text-[#D1D6D4] hover:bg-[#262C2A]'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-white/30"
                    style={{ backgroundColor: fin.swatch }}
                  />
                  <span>{fin.label}</span>
                </button>
              );
            })}
          </div>

          {/* Hardware Toggles */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => onUpdateSettings({ aodEnabled: !settings.aodEnabled })}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-2 text-[11px] font-medium transition-colors ${
                settings.aodEnabled
                  ? 'border-[#63D4A3]/60 bg-[#152920] text-[#63D4A3]'
                  : 'border-[#2E3532] bg-[#1E2321] text-[#D1D6D4] hover:bg-[#262C2A]'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>AOD</span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateSettings({ audioEnabled: !settings.audioEnabled })}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-2 text-[11px] font-medium transition-colors ${
                settings.audioEnabled
                  ? 'border-[#63D4A3]/60 bg-[#152920] text-[#63D4A3]'
                  : 'border-[#2E3532] bg-[#1E2321] text-[#D1D6D4] hover:bg-[#262C2A]'
              }`}
            >
              {settings.audioEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              <span>Audio</span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-2 text-[11px] font-medium transition-colors ${
                settings.hapticsEnabled
                  ? 'border-[#63D4A3]/60 bg-[#152920] text-[#63D4A3]'
                  : 'border-[#2E3532] bg-[#1E2321] text-[#D1D6D4] hover:bg-[#262C2A]'
              }`}
            >
              <Vibrate className="h-3.5 w-3.5" />
              <span>Haptics</span>
            </button>
          </div>

          {/* Anchor Voice Tone & Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#9CA3A0]">Anchor Voice Tone</p>
              <button
                type="button"
                onClick={() => previewAnchorVoice(activeVoice, setVoicePreviewStatus)}
                className="inline-flex items-center gap-1 rounded-md border border-[#63D4A3]/45 bg-[#152920] px-2 py-0.5 text-[10.5px] font-semibold text-[#63D4A3] transition-colors hover:bg-[#1B362A]"
              >
                <Play className="h-2.5 w-2.5" />
                <span>Preview</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {ANCHOR_VOICE_PRESETS.map((preset) => {
                const active = activeVoice === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setAnchorVoicePreset(preset.id);
                      onUpdateSettings({ anchorVoice: preset.id });
                      previewAnchorVoice(preset.id, setVoicePreviewStatus);
                    }}
                    className={`rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'border-[#63D4A3] bg-[#152920] text-[#F4F6F5]'
                        : 'border-[#2E3532] bg-[#1E2321] text-[#D1D6D4] hover:bg-[#262C2A]'
                    }`}
                  >
                    {preset.label}
                  </button>
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
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTile(t.id)}
                    className={`rounded-lg border px-1.5 py-1.5 text-[10.5px] font-medium transition-colors whitespace-nowrap ${
                      active
                        ? isAnchor
                          ? 'border-[#E89B8C] bg-[#2A1B19] text-[#F0B0A3]'
                          : 'border-[#63D4A3] bg-[#152920] text-[#63D4A3]'
                        : isAnchor
                        ? 'border-[#4D302B] bg-[#1D1615] text-[#E89B8C] hover:bg-[#271C1A]'
                        : 'border-[#2E3532] bg-[#1E2321] text-[#D1D6D4] hover:bg-[#262C2A]'
                    }`}
                  >
                    {t.shortName}
                  </button>
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
            <button
              type="button"
              onClick={onResetDemoData}
              className="flex items-center gap-1 text-xs font-medium text-[#9CA3A0] hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset 30D Data</span>
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
};

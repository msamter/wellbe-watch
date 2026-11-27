import React, { useEffect, useState } from 'react';
import { Music, Pause, Play, Volume2 } from 'lucide-react';
import {
  setSanctuaryVolume,
  startSanctuaryAudio,
  stopSanctuaryAudio,
} from '../../utils/audioHaptics';

export interface SanctuaryAudioBarProps {
  autoPlay?: boolean;
  compact?: boolean;
  onHaptic: (color?: string) => void;
}

export const SanctuaryAudioBar: React.FC<SanctuaryAudioBarProps> = ({
  autoPlay = false,
  compact = false,
  onHaptic,
}) => {
  const [playing, setPlaying] = useState(autoPlay);
  const [volume, setVolume] = useState(0.68);

  useEffect(() => {
    if (playing) {
      startSanctuaryAudio(volume);
    } else {
      stopSanctuaryAudio();
    }
    return () => {
      stopSanctuaryAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => {
    if (playing) {
      setSanctuaryVolume(volume);
    }
  }, [volume, playing]);

  return (
    <div
      className={`flex w-full items-center justify-between gap-2 rounded-[14px] border border-[#2B312F] bg-[#161A19] ${
        compact ? 'px-2 py-1.5' : 'px-2.5 py-2'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => {
            onHaptic();
            setPlaying((p) => !p);
          }}
          aria-label={playing ? 'Pause Soothing Sanctuary audio' : 'Play Soothing Sanctuary audio'}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border border-[#2E3532] bg-[#202523] text-[#F4F6F5] transition-colors hover:bg-[#282E2C] active:scale-90"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </button>

        <div className="min-w-0 text-left">
          <div className="flex items-center gap-1">
            <Music className="h-3 w-3 shrink-0 text-[#63D4A3]" />
            <span className="truncate text-[10.5px] font-semibold text-[#F4F6F5]">
              Soothing Sanctuary
            </span>
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                playing ? 'bg-[#63D4A3]' : 'bg-[#4E5754]'
              }`}
            />
          </div>
          <p className="truncate text-[9px] text-[#9CA3A0]">
            {`Piano, Harp & Strings · ${playing ? 'Playing' : 'Paused'}`}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Volume2 className="h-3 w-3 text-[#63D4A3]" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Sanctuary audio volume"
          className="h-1 w-11 cursor-pointer accent-[#63D4A3]"
        />
      </div>
    </div>
  );
};

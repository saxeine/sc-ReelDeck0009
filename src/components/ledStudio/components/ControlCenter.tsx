import { ChangeEvent, KeyboardEvent, useEffect, useState } from 'react';
import { GAP_PRESETS, MappingMode } from '../types';

interface ControlCenterProps {
  size: number;
  gap: number;
  mode: MappingMode;
  outlines: boolean;
  onSizeChange: (size: number) => void;
  onGapChange: (gap: number) => void;
  onModeChange: (mode: MappingMode) => void;
  onToggleOutlines: () => void;
  onFileUpload: (file: File) => void;
}

export function ControlCenter({
  size,
  gap,
  mode,
  outlines,
  onSizeChange,
  onGapChange,
  onModeChange,
  onToggleOutlines,
  onFileUpload,
}: ControlCenterProps) {
  const [sizeDraft, setSizeDraft] = useState<string>(String(size));

  useEffect(() => {
    setSizeDraft(String(size));
  }, [size]);

  const commitSizeDraft = (raw: string) => {
    const parsed = Number(raw);
    const clamped = Math.max(100, Math.min(2000, parsed || 500));
    setSizeDraft(String(clamped));
    onSizeChange(clamped);
  };

  const handleSizeInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setSizeDraft(next);
    const numeric = Number(next);
    if (next !== '' && !Number.isNaN(numeric) && numeric >= 100 && numeric <= 2000) {
      onSizeChange(numeric);
    }
  };

  const handleSizeKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitSizeDraft(sizeDraft);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      return;
    }
    onFileUpload(selectedFile);
    e.target.value = '';
  };

  return (
    <aside className="flex flex-col border border-led-border bg-led-card rounded-[8px]">
      <div className="flex items-center justify-between p-[20px] border-b border-led-border">
        <div>
          <div className="flex items-center gap-[9px]">
            <span className="text-[#b9d996] text-[16px]">☷</span>
            <h2 className="font-led-display font-semibold text-[15px] m-0">
              Control center
            </h2>
          </div>
        </div>
        <span className="text-[#7d8c7e] text-[19px]">✳</span>
      </div>

      <div className="px-[20px]">
        {/* 01 DISPLAY LAYOUT */}
        <div className="py-[20px] border-b border-[#2a2e2f]">
          <div className="flex items-center gap-[9px] mb-[16px]">
            <span className="text-[9px] font-bold text-[#9eba81]">01</span>
            <h3 className="text-[10px] tracking-[1px] m-0 text-[#c7ceca] font-bold">
              DISPLAY LAYOUT
            </h3>
          </div>

          <div className="flex items-center gap-[10px] bg-[#1c211d] border border-[#323b31] rounded-[5px] p-[10px]">
            <div className="w-[30px] h-[30px] grid grid-cols-2 gap-[2px] shrink-0">
              <i className="bg-[#677d59] border border-[#a8c68c] rounded-[1px]" />
              <i className="bg-[#677d59] border border-[#a8c68c] rounded-[1px]" />
              <i className="bg-[#677d59] border border-[#a8c68c] rounded-[1px]" />
              <i className="bg-[#677d59] border border-[#a8c68c] rounded-[1px]" />
            </div>
            <div>
              <strong className="block text-[11px] font-bold">4 × 4 grid</strong>
              <small className="block text-[10px] text-[#858f88] mt-[4px]">
                16 display panels
              </small>
            </div>
            <span className="ml-auto text-[8px] tracking-[0.8px] text-[#a8b5a2] bg-[#303b2c] py-[4px] px-[6px] rounded-[3px]">
              FIXED
            </span>
          </div>

          <div className="flex items-center justify-between mt-[15px] mb-[9px] text-[11px] text-[#c6ceca]">
            <label htmlFor="panel-size">Panel size</label>
            <span className="text-[10px] text-[#7a8580]">Width &amp; height</span>
          </div>

          <div className="border border-[#373d3a] rounded-[5px] bg-[#1b1f1d] flex items-center">
            <input
              id="panel-size"
              type="number"
              min={100}
              max={2000}
              step={10}
              value={sizeDraft}
              onChange={handleSizeInputChange}
              onBlur={() => commitSizeDraft(sizeDraft)}
              onKeyDown={handleSizeKeyDown}
              className="bg-transparent border-0 text-[#dce3d9] py-[9px] px-[11px] outline-0 w-full text-[12px] font-sans focus-visible:outline-2 focus-visible:outline-led-lime focus-visible:outline-offset-2 rounded-[5px]"
            />
            <span className="pr-[11px] text-[#818b83] text-[10px]">mm</span>
          </div>
        </div>

        {/* 02 PANEL SPACING */}
        <div className="py-[20px] border-b border-[#2a2e2f]">
          <div className="flex items-center gap-[9px] mb-[16px]">
            <span className="text-[9px] font-bold text-[#9eba81]">02</span>
            <h3 className="text-[10px] tracking-[1px] m-0 text-[#c7ceca] font-bold">
              PANEL SPACING
            </h3>
            <b className="ml-auto text-[#707b73] text-[14px]">↔</b>
          </div>

          <div className="flex items-center justify-between mt-[15px] mb-[9px] text-[11px] text-[#c6ceca]">
            <label htmlFor="gap">Gap between panels</label>
            <strong className="text-[13px] text-led-lime font-semibold">
              {gap}{' '}
              <small className="text-[10px] text-[#9ba994] font-normal">mm</small>
            </strong>
          </div>

          <input
            id="gap"
            type="range"
            min={0}
            max={300}
            step={5}
            value={gap}
            onChange={(e) => onGapChange(Number(e.target.value))}
            className="w-full h-[4px] accent-led-lime cursor-pointer mt-[9px] mb-[6px] focus-visible:outline-2 focus-visible:outline-led-lime focus-visible:outline-offset-2"
          />

          <div className="flex justify-between text-[#717c74] text-[9px]">
            <span>0 mm</span>
            <span>300 mm</span>
          </div>

          <div className="grid grid-cols-4 gap-[5px] mt-[16px]">
            {GAP_PRESETS.map((preset) => {
              const isSelected = gap === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onGapChange(preset.value)}
                  className={`border rounded-[4px] text-[10px] py-[7px] px-0 cursor-pointer text-center focus-visible:outline-2 focus-visible:outline-led-lime focus-visible:outline-offset-2 ${
                    isSelected
                      ? 'border-[#9cc97d] text-[#d3edae] bg-[#2b3828]'
                      : 'border-[#353b37] bg-[#1c201e] text-[#a6afa9]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 03 CONTENT MAPPING */}
        <div className="py-[20px] border-b border-[#2a2e2f]">
          <div className="flex items-center gap-[9px] mb-[16px]">
            <span className="text-[9px] font-bold text-[#9eba81]">03</span>
            <h3 className="text-[10px] tracking-[1px] m-0 text-[#c7ceca] font-bold">
              CONTENT MAPPING
            </h3>
          </div>

          <div className="flex p-[3px] border border-[#333936] bg-[#101411] rounded-[5px]">
            <button
              type="button"
              onClick={() => onModeChange(MappingMode.Compensated)}
              className={`w-1/2 border-0 font-semibold text-[10px] py-[9px] px-[3px] rounded-[3px] cursor-pointer text-center focus-visible:outline-2 focus-visible:outline-led-lime focus-visible:outline-offset-2 ${
                mode === MappingMode.Compensated
                  ? 'bg-[#34422f] text-[#d6eac3]'
                  : 'bg-transparent text-[#89928c]'
              }`}
            >
              Gap compensated
            </button>
            <button
              type="button"
              onClick={() => onModeChange(MappingMode.Joined)}
              className={`w-1/2 border-0 font-semibold text-[10px] py-[9px] px-[3px] rounded-[3px] cursor-pointer text-center focus-visible:outline-2 focus-visible:outline-led-lime focus-visible:outline-offset-2 ${
                mode === MappingMode.Joined
                  ? 'bg-[#34422f] text-[#d6eac3]'
                  : 'bg-transparent text-[#89928c]'
              }`}
            >
              Joined image
            </button>
          </div>

          <p className="text-[10px] text-[#808c84] leading-[1.5] mt-[10px] mb-[16px]">
            {mode === MappingMode.Compensated
              ? 'Keeps the image in proportion. Content in gaps is hidden.'
              : 'Splits the entire image across the panels. Gaps visually separate the content.'}
          </p>

          <div className="flex justify-between items-center">
            <div>
              <strong className="block text-[11px] font-bold">Panel outlines</strong>
              <small className="block text-[10px] text-[#858f88] mt-[4px]">
                Show individual panel boundaries
              </small>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={outlines}
              aria-label="Show panel outlines"
              onClick={onToggleOutlines}
              className={`w-[31px] h-[18px] border-0 rounded-[20px] p-[2px] cursor-pointer focus-visible:outline-2 focus-visible:outline-led-lime focus-visible:outline-offset-2 ${
                outlines ? 'bg-[#b5dc7d]' : 'bg-[#4d5550]'
              }`}
            >
              <span
                className={`block w-[14px] h-[14px] rounded-full transition-transform duration-150 ${
                  outlines
                    ? 'translate-x-[13px] bg-[#1d2a19]'
                    : 'translate-x-0 bg-white'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 04 YOUR CONTENT */}
        <div className="py-[20px]">
          <div className="flex items-center gap-[9px] mb-[16px]">
            <span className="text-[9px] font-bold text-[#9eba81]">04</span>
            <h3 className="text-[10px] tracking-[1px] m-0 text-[#c7ceca] font-bold">
              YOUR CONTENT
            </h3>
          </div>

          <label
            htmlFor="file"
            className="border border-dashed border-[#53614d] hover:border-[#b2d589] bg-[#1b211a] rounded-[5px] p-[12px] flex items-center gap-[10px] cursor-pointer"
          >
            <span className="text-[#c9e6aa] text-[18px] border border-[#465640] w-[28px] h-[28px] rounded-[4px] grid place-items-center shrink-0">
              ↑
            </span>
            <span>
              <strong className="block text-[11px] font-bold">
                Upload an image or video
              </strong>
              <small className="block text-[10px] text-[#858f88] mt-[4px]">
                JPG, PNG, WebP, MP4 or WebM
              </small>
            </span>
            <span className="ml-auto text-[19px] text-[#a7b6a5]">+</span>
          </label>

          <input
            type="file"
            id="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </aside>
  );
}

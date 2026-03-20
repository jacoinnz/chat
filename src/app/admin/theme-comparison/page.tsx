"use client";

import { useState } from "react";

type ThemeKey = 1 | 2 | 3;

interface Theme {
  name: string;
  tag: string;
  bg: string;
  sidebar: string;
  sidebarText: string;
  accent: string;
  accentLight: string;
  accentMid: string;
  accentText: string;
  msgAiBg: string;
  msgAiBorder: string;
  msgAiColor: string;
  msgUserBg: string;
  msgUserColor: string;
  fileBg: string;
  fileBorder: string;
  fileIconBg: string;
  fileIconColor: string;
  fileNameColor: string;
  fileMetaColor: string;
  btnPrimBg: string;
  btnPrimColor: string;
  btnSecBg: string;
  btnSecColor: string;
  inputBg: string;
  inputBorder: string;
  sendBg: string;
  sendColor: string;
  swatches: string[];
  verdictBg: string;
  verdictBorder: string;
  verdictColor: string;
  verdict: string;
  tags: string[];
}

const THEMES: Record<ThemeKey, Theme> = {
  1: {
    name: "Theme 1 \u2014 Microsoft blue",
    tag: "SharePoint aligned",
    bg: "#f3f8fd",
    sidebar: "#0d3b66", sidebarText: "#ffffff",
    accent: "#0078d4", accentLight: "#EBF4FF", accentMid: "#1976d2", accentText: "#0050a0",
    msgAiBg: "#ffffff", msgAiBorder: "#c7dff7", msgAiColor: "#1a2a3a",
    msgUserBg: "#0078d4", msgUserColor: "#ffffff",
    fileBg: "#f0f8ff", fileBorder: "#c7dff7", fileIconBg: "#dbeeff", fileIconColor: "#0050a0",
    fileNameColor: "#0d3b66", fileMetaColor: "#5a7a9a",
    btnPrimBg: "#0078d4", btnPrimColor: "#ffffff",
    btnSecBg: "#EBF4FF", btnSecColor: "#0050a0",
    inputBg: "#f3f8fd", inputBorder: "#c7dff7",
    sendBg: "#0078d4", sendColor: "#ffffff",
    swatches: ["#0d3b66", "#0078d4", "#1976d2", "#e8eef4", "#f3f8fd", "#1a2a3a"],
    verdictBg: "#EBF4FF", verdictBorder: "#0078d4", verdictColor: "#0050a0",
    verdict: "Closest to SharePoint\u2019s visual identity. The dark navy sidebar mirrors the SharePoint top nav. Microsoft blue (#0078d4) is the exact M365 brand colour \u2014 users recognise it immediately as part of their Microsoft environment which builds trust and reduces adoption friction. The blue-grey background (#e8eef4) feels slightly dated compared to modern AI tools.",
    tags: ["SharePoint familiar", "M365 trusted", "Slightly dated bg", "Good for enterprise rollout"],
  },
  2: {
    name: "Theme 2 \u2014 Teams purple",
    tag: "Microsoft Teams aligned",
    bg: "#f5f5fb",
    sidebar: "#2b2b40", sidebarText: "#ffffff",
    accent: "#5b5fc7", accentLight: "#EEEEFF", accentMid: "#7b7fd4", accentText: "#3d3fa0",
    msgAiBg: "#ffffff", msgAiBorder: "#dddff7", msgAiColor: "#242424",
    msgUserBg: "#5b5fc7", msgUserColor: "#ffffff",
    fileBg: "#f5f5fb", fileBorder: "#dddff7", fileIconBg: "#EEEEFF", fileIconColor: "#3d3fa0",
    fileNameColor: "#242424", fileMetaColor: "#616161",
    btnPrimBg: "#5b5fc7", btnPrimColor: "#ffffff",
    btnSecBg: "#EEEEFF", btnSecColor: "#3d3fa0",
    inputBg: "#f0f0f8", inputBorder: "#dddff7",
    sendBg: "#5b5fc7", sendColor: "#ffffff",
    swatches: ["#2b2b40", "#5b5fc7", "#7b7fd4", "#f5f5fb", "#ffffff", "#242424"],
    verdictBg: "#EEEEFF", verdictBorder: "#5b5fc7", verdictColor: "#3d3fa0",
    verdict: "Microsoft Teams uses this exact purple (#5b5fc7) as its primary brand colour. Since your users are in Teams all day, this palette creates the strongest familiarity signal. The charcoal sidebar (#2b2b40) feels modern and sophisticated \u2014 identical to Teams\u2019 own app bar. Best choice if the Teams bot integration is a priority feature.",
    tags: ["Teams familiar", "Modern feel", "AI chatbot natural", "Best for Teams integration"],
  },
  3: {
    name: "Theme 3 \u2014 Clean neutral",
    tag: "AI-first, high contrast",
    bg: "#f9f9f9",
    sidebar: "#1a1a1a", sidebarText: "#ffffff",
    accent: "#107c41", accentLight: "#F0FBF7", accentMid: "#2ea05e", accentText: "#0a5c30",
    msgAiBg: "#ffffff", msgAiBorder: "#e5e5e5", msgAiColor: "#111111",
    msgUserBg: "#111111", msgUserColor: "#ffffff",
    fileBg: "#f9f9f9", fileBorder: "#e5e5e5", fileIconBg: "#E8F5EE", fileIconColor: "#0a5c30",
    fileNameColor: "#111111", fileMetaColor: "#666666",
    btnPrimBg: "#107c41", btnPrimColor: "#ffffff",
    btnSecBg: "#f0f0f0", btnSecColor: "#333333",
    inputBg: "#f0f0f0", inputBorder: "#e0e0e0",
    sendBg: "#111111", sendColor: "#ffffff",
    swatches: ["#1a1a1a", "#107c41", "#2ea05e", "#f9f9f9", "#ffffff", "#111111"],
    verdictBg: "#F0FBF7", verdictBorder: "#107c41", verdictColor: "#0a5c30",
    verdict: "This is how ChatGPT, Claude, and Perplexity approach colour \u2014 near-black sidebar, pure white content area, maximum contrast, minimal colour except for the accent. The green references Microsoft Excel and SharePoint document library green. It feels the most like an AI tool, which helps adoption \u2014 users understand immediately this is AI-powered search, not another intranet page.",
    tags: ["AI-first feel", "Maximum contrast", "Clean modern", "Excel green reference"],
  },
};

function ThemeCard({ t }: { t: Theme }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Chat view */}
        <div className="rounded-[10px] overflow-hidden border border-[#e0e0e0]" style={{ background: t.bg }}>
          <div className="px-3.5 py-2.5 text-xs font-semibold tracking-wide" style={{ background: t.sidebar, color: t.sidebarText }}>
            {t.name} \u2014 chat view
          </div>
          <div className="p-3 flex flex-col gap-2">
            {/* AI message */}
            <div className="rounded-[10px] px-3 py-2.5 text-xs leading-relaxed max-w-[85%]" style={{ background: t.msgAiBg, border: `1px solid ${t.msgAiBorder}`, color: t.msgAiColor }}>
              Found <strong>12 results</strong> for leave policy. Here is a summary based on your SharePoint documents.
            </div>
            {/* File card */}
            <div className="rounded-lg p-2.5 flex gap-2 items-start" style={{ background: t.fileBg, border: `1px solid ${t.fileBorder}` }}>
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-semibold shrink-0" style={{ background: t.fileIconBg, color: t.fileIconColor }}>
                W
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold" style={{ color: t.fileNameColor }}>Annual Leave Policy 2026.docx</div>
                <div className="text-[10px] mt-0.5" style={{ color: t.fileMetaColor }}>HR \u00b7 Updated 3 days ago</div>
                <div className="flex gap-1 mt-1.5">
                  <button className="px-2.5 py-1 rounded text-[10px] font-semibold border-none cursor-pointer" style={{ background: t.btnPrimBg, color: t.btnPrimColor }}>Open</button>
                  <button className="px-2.5 py-1 rounded text-[10px] font-semibold border-none cursor-pointer" style={{ background: t.btnSecBg, color: t.btnSecColor }}>Preview</button>
                </div>
              </div>
            </div>
            {/* User message */}
            <div className="rounded-[10px] px-3 py-2 text-xs ml-auto max-w-[72%]" style={{ background: t.msgUserBg, color: t.msgUserColor }}>
              show me only excel files
            </div>
            {/* Input row */}
            <div className="flex gap-1.5 items-center p-2 rounded-lg" style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}` }}>
              <input
                className="flex-1 text-[11px] px-2.5 py-1.5 rounded-md border font-inherit"
                style={{ background: t.msgAiBg, borderColor: t.inputBorder, color: t.fileMetaColor }}
                placeholder="Search your SharePoint..."
                readOnly
              />
              <button className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-[13px] border-none cursor-pointer" style={{ background: t.sendBg, color: t.sendColor }}>
                \u2192
              </button>
            </div>
          </div>
          {/* Swatches */}
          <div className="flex gap-1.5 px-3.5 py-2.5 border-t border-black/[0.07] flex-wrap items-center">
            {t.swatches.map((s) => (
              <div key={s} className="w-[18px] h-[18px] rounded border border-black/10" style={{ background: s }} />
            ))}
            <span className="text-[10px] text-[#888] ml-1">{t.tag}</span>
          </div>
        </div>

        {/* Admin view */}
        <div className="rounded-[10px] overflow-hidden border border-[#e0e0e0]" style={{ background: t.bg }}>
          <div className="px-3.5 py-2.5 text-xs font-semibold tracking-wide" style={{ background: t.sidebar, color: t.sidebarText }}>
            {t.name} \u2014 admin view
          </div>
          <div className="grid grid-cols-[72px_1fr] min-h-[180px]">
            <div className="py-2.5 flex flex-col gap-0.5" style={{ background: t.sidebar }}>
              {["Overview", "Metadata", "Search", "AI", "Analytics"].map((item, i) => (
                <div key={item} className="px-2.5 py-1.5 text-[10px] cursor-pointer" style={{ color: t.sidebarText, opacity: i === 0 ? 0.9 : 0.5, fontWeight: i === 0 ? 600 : 400 }}>
                  {item}
                </div>
              ))}
            </div>
            <div className="p-2.5" style={{ background: t.bg }}>
              <div className="text-[11px] font-semibold mb-2" style={{ color: t.fileNameColor }}>Tenant overview</div>
              <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                {[{ label: "Searches", val: "147" }, { label: "Users", val: "38" }].map((stat) => (
                  <div key={stat.label} className="rounded-md p-2" style={{ background: t.accentLight }}>
                    <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: t.fileMetaColor }}>{stat.label}</div>
                    <div className="text-[17px] font-semibold" style={{ color: t.accentText }}>{stat.val}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-md p-2" style={{ background: t.fileBg, border: `1px solid ${t.fileBorder}` }}>
                <div className="text-[10px] font-semibold mb-1" style={{ color: t.fileNameColor }}>System health</div>
                {[{ name: "Graph API", ms: "142ms" }, { name: "Claude AI", ms: "287ms" }].map((row) => (
                  <div key={row.name} className="flex items-center gap-1.5 text-[10px] mb-0.5" style={{ color: t.fileMetaColor }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#107c41]" />
                    {row.name} \u2014 {row.ms}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verdict */}
      <div className="rounded-[10px] px-4 py-3.5 mb-3" style={{ background: t.verdictBg, border: `1px solid ${t.verdictBorder}` }}>
        <div className="text-sm font-semibold mb-1.5" style={{ color: t.verdictColor }}>{t.name}</div>
        <div className="text-xs leading-relaxed mb-2.5" style={{ color: t.verdictColor }}>{t.verdict}</div>
        <div className="flex gap-1.5 flex-wrap">
          {t.tags.map((tag) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-xl text-[11px] font-semibold" style={{ background: t.accentLight, color: t.accentText }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

export default function ThemeComparisonPage() {
  const [selected, setSelected] = useState<ThemeKey | "all">(1);

  const btnClass = (key: ThemeKey | "all", active: boolean) => {
    const base = "px-4 py-2 text-[13px] rounded-[20px] cursor-pointer transition-all font-inherit";
    if (!active) return `${base} border border-[#d0d0d0] bg-white text-[#555] hover:border-[#999]`;
    if (key === 1) return `${base} border-2 border-[#0078d4] bg-[#EBF4FF] text-[#0050a0] font-semibold`;
    if (key === 2) return `${base} border-2 border-[#5b5fc7] bg-[#EEEEFF] text-[#3d3fa0] font-semibold`;
    if (key === 3) return `${base} border-2 border-[#107c41] bg-[#F0FBF7] text-[#0a5c30] font-semibold`;
    return `${base} border-2 border-[#666] bg-[#f5f5f5] text-[#333] font-semibold`;
  };

  return (
    <div className="max-w-5xl">
      <h2 className="text-xl font-semibold text-[#111] mb-1">Colour theme comparison</h2>
      <p className="text-[13px] text-[#666] mb-5">Three palettes compared across chat and admin views</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button className={btnClass(1, selected === 1)} onClick={() => setSelected(1)}>Theme 1 \u2014 Microsoft blue</button>
        <button className={btnClass(2, selected === 2)} onClick={() => setSelected(2)}>Theme 2 \u2014 Teams purple</button>
        <button className={btnClass(3, selected === 3)} onClick={() => setSelected(3)}>Theme 3 \u2014 Clean neutral</button>
        <button className={btnClass("all", selected === "all")} onClick={() => setSelected("all")}>Show all 3</button>
      </div>

      {selected === "all" ? (
        <div className="space-y-8">
          {([1, 2, 3] as ThemeKey[]).map((key) => (
            <div key={key}>
              <h3 className="text-[15px] font-semibold mb-3 pb-2 border-b border-[#e0e0e0]">{THEMES[key].name}</h3>
              <ThemeCard t={THEMES[key]} />
            </div>
          ))}
        </div>
      ) : (
        <ThemeCard t={THEMES[selected]} />
      )}
    </div>
  );
}

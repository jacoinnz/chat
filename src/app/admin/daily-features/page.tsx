'use client'

import { useState } from 'react'

type NavId = 'home' | 'search' | 'collections' | 'pinned' | 'favourites' | 'recent'

interface NavItem {
  id: NavId
  label: string
  icon: (active: boolean) => React.ReactNode
}

interface DocItem {
  icon: string
  iconClass: string
  name: string
  meta: string
  time: string
}

interface TrendItem {
  rank: number
  query: string
  count: string
  pct: number
}

interface PinnedItem {
  query: string
  meta: string
  badge: string
  badgeVariant: 'red' | 'blue' | 'gray'
  pulse?: boolean
}

interface CollectionItem {
  name: string
  count: string
  docs: string[]
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.4}
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.15 : 0}
        strokeLinejoin="round"
      />
      <path d="M7.5 18v-5h5v5" stroke="currentColor" strokeWidth={active ? 1.8 : 1.4} strokeLinecap="round" />
    </svg>
  )
}

function IconSearch({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth={active ? 1.8 : 1.4} />
      <path d="M13 13l4 4" stroke="currentColor" strokeWidth={active ? 1.8 : 1.4} strokeLinecap="round" />
    </svg>
  )
}

function IconCollections({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect
        x="3" y="8" width="14" height="9" rx="1.5"
        stroke="currentColor" strokeWidth={active ? 1.8 : 1.4}
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0}
      />
      <path d="M6 8V6a1 1 0 011-1h6a1 1 0 011 1v2" stroke="currentColor" strokeWidth={active ? 1.8 : 1.4} />
      <path d="M7 12h6M7 14.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function IconPinned({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M13.5 2.5l4 4-1.5 1.5-1-1-3 3v2.5L10.5 14l-2-2-3 3-.7-.7 3-3-2-2 1.5-1.5H9.5l3-3-1-1 1.5-1.5z"
        stroke="currentColor" strokeWidth={active ? 1.8 : 1.4}
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconFavourites({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 13.3l-4.2 2.2.8-4.7-3.4-3.3 4.7-.7L10 2.5z"
        stroke="currentColor" strokeWidth={active ? 1.8 : 1.4}
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.2 : 0}
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconRecent({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth={active ? 1.8 : 1.4} />
      <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth={active ? 1.8 : 1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const navItems: NavItem[] = [
  { id: 'home',        label: 'Home',            icon: (a) => <IconHome active={a} /> },
  { id: 'search',      label: 'Search',           icon: (a) => <IconSearch active={a} /> },
  { id: 'collections', label: 'Collections',      icon: (a) => <IconCollections active={a} /> },
  { id: 'pinned',      label: 'Pinned searches',  icon: (a) => <IconPinned active={a} /> },
  { id: 'favourites',  label: 'Favourites',       icon: (a) => <IconFavourites active={a} /> },
  { id: 'recent',      label: 'Recent',           icon: (a) => <IconRecent active={a} /> },
]

// ─── Static data ──────────────────────────────────────────────────────────────

const recentDocs: DocItem[] = [
  { icon: 'XL',  iconClass: 'bg-green-100 text-green-800', name: 'Q1 Forecast v3.xlsx',              meta: 'Finance-Team \u00b7 Shared Documents/Budgets', time: '2h ago' },
  { icon: 'W',   iconClass: 'bg-blue-100 text-blue-800',   name: 'Safety Induction Policy 2026.docx', meta: 'HR \u00b7 Policies/Safety',                   time: '4h ago' },
  { icon: 'PDF', iconClass: 'bg-red-100 text-red-800',     name: 'Project Falcon Brief.pdf',          meta: 'Strategy \u00b7 Planning/2026',                time: '6h ago' },
]

const trending: TrendItem[] = [
  { rank: 1, query: 'Q1 budget',            count: '47 searches', pct: 90 },
  { rank: 2, query: 'leave policy',          count: '31 searches', pct: 65 },
  { rank: 3, query: 'expense reimbursement', count: '22 searches', pct: 45 },
  { rank: 4, query: 'onboarding checklist',  count: '14 searches', pct: 30 },
]

const pinnedItems: PinnedItem[] = [
  { query: 'Q4 budget xlsx',              meta: 'Finance-Team \u00b7 Last result 2h ago',  badge: '3 new',  badgeVariant: 'red',  pulse: true },
  { query: 'safety procedures warehouse', meta: 'Operations \u00b7 Last result yesterday',  badge: '1 new',  badgeVariant: 'blue' },
  { query: 'John Deere fault codes pdf',  meta: 'Equipment \u00b7 Last result 3 days ago', badge: 'No new', badgeVariant: 'gray' },
]

const badgeClasses: Record<PinnedItem['badgeVariant'], string> = {
  red:  'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-600',
}

const collections: CollectionItem[] = [
  { name: 'Q4 Budget Pack',          count: '5 documents \u00b7 Updated 2h ago',    docs: ['Q4 Forecast.xlsx', 'Budget Summary.docx', 'Variance Report.pdf', '+2 more'] },
  { name: 'Onboarding Resources',    count: '12 documents \u00b7 Shared with team', docs: ['Employee Handbook.pdf', 'IT Setup Guide.docx', 'Leave Policy.docx', '+9 more'] },
  { name: 'Tractor Service Manuals', count: '8 documents \u00b7 Equipment site',    docs: ['JD 6M Manual.pdf', 'Case IH Service.pdf', 'Fault Codes.xlsx', '+5 more'] },
]

const favouriteDocs: DocItem[] = [
  { icon: 'XL',  iconClass: 'bg-green-100 text-green-800', name: 'Annual Budget Template.xlsx',   meta: 'Finance-Team \u00b7 Saved by you', time: '5 days ago' },
  { icon: 'PDF', iconClass: 'bg-red-100 text-red-800',     name: 'Health & Safety Manual.pdf',    meta: 'HR \u00b7 Saved by you',           time: '2 weeks ago' },
  { icon: 'W',   iconClass: 'bg-blue-100 text-blue-800',   name: 'Project Charter Template.docx', meta: 'Strategy \u00b7 Saved by you',     time: '1 month ago' },
]

const allRecentDocs: DocItem[] = [
  { icon: 'XL',  iconClass: 'bg-green-100 text-green-800', name: 'Q1 Forecast v3.xlsx',              meta: 'Finance-Team \u00b7 Opened by you', time: '1h ago' },
  { icon: 'W',   iconClass: 'bg-blue-100 text-blue-800',   name: 'Safety Induction Policy 2026.docx', meta: 'HR \u00b7 Opened by you',           time: '3h ago' },
  { icon: 'PDF', iconClass: 'bg-red-100 text-red-800',     name: 'Project Falcon Brief.pdf',          meta: 'Strategy \u00b7 Opened by you',     time: '5h ago' },
  { icon: 'XL',  iconClass: 'bg-green-100 text-green-800', name: 'Leave Tracker 2026.xlsx',           meta: 'HR \u00b7 Opened by you',           time: 'Yesterday' },
  { icon: 'W',   iconClass: 'bg-blue-100 text-blue-800',   name: 'Fleet Maintenance Schedule.docx',   meta: 'Operations \u00b7 Opened by you',   time: 'Yesterday' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-400 mb-2 mt-5 first:mt-0">
      {children}
    </p>
  )
}

function DocRow({ doc }: { doc: DocItem }) {
  return (
    <div className="flex items-start gap-2.5 p-2.5 border border-[#e8eef4] rounded-lg cursor-pointer hover:bg-[#f3f8fd] transition-colors">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-semibold shrink-0 ${doc.iconClass}`}>
        {doc.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#0d3b66] truncate">{doc.name}</p>
        <p className="text-[11px] text-gray-400">{doc.meta}</p>
      </div>
      <span className="text-[11px] text-gray-400 whitespace-nowrap">{doc.time}</span>
    </div>
  )
}

// ─── Panels ───────────────────────────────────────────────────────────────────

function HomePanel() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#0d3b66]">Good morning, Alice</h2>
      <p className="text-sm text-gray-400 mb-4">Friday 21 March \u00b7 Contoso Ltd \u00b7 Finance-Team</p>

      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 text-[13px] text-orange-700">
        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
        3 documents you own are overdue for review \u00b7{' '}
        <span className="underline cursor-pointer font-medium">View them</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: 'Searches today', val: '24', change: '+8 vs yesterday' },
          { label: 'New docs today', val: '7',  change: 'across 3 sites' },
          { label: 'AI answers',     val: '18', change: '89% positive' },
        ].map((m) => (
          <div key={m.label} className="bg-[#f3f8fd] border border-[#e8eef4] rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">{m.label}</p>
            <p className="text-2xl font-semibold text-[#0d3b66]">{m.val}</p>
            <p className="text-[11px] text-green-700 mt-0.5">{m.change}</p>
          </div>
        ))}
      </div>

      <SectionTitle>Updated today</SectionTitle>
      <div className="flex flex-col gap-2 mb-1">
        {recentDocs.map((doc) => <DocRow key={doc.name} doc={doc} />)}
      </div>

      <SectionTitle>Trending in your org</SectionTitle>
      <div className="border border-[#e8eef4] rounded-lg p-3 flex flex-col gap-2">
        {trending.map((t) => (
          <div key={t.rank} className="flex items-center gap-2 border-b border-[#e8eef4] last:border-0 pb-2 last:pb-0">
            <span className="text-[12px] font-semibold text-gray-300 w-4">{t.rank}</span>
            <div className="flex-1">
              <p className="text-[13px] text-[#0d3b66]">{t.query}</p>
              <div className="h-1 bg-[#e8eef4] rounded mt-1">
                <div className="h-1 bg-[#1976d2] rounded" style={{ width: `${t.pct}%` }} />
              </div>
            </div>
            <span className="text-[11px] text-gray-400 whitespace-nowrap">{t.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SearchPanel() {
  const [showSuggestions, setShowSuggestions] = useState(false)

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#0d3b66]">Smart search</h2>
      <p className="text-sm text-gray-400 mb-4">Suggestions appear as you type \u2014 recent, trending, and document matches</p>

      <div className="relative mb-5">
        <div className="flex items-center gap-2 px-3 py-2.5 border border-[#c4d4e4] rounded-lg bg-[#f3f8fd]">
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 16 16">
            <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            className="flex-1 bg-transparent text-[13px] outline-none text-[#0d3b66] placeholder-gray-400"
            placeholder="Type to search your SharePoint..."
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
        </div>
        {showSuggestions && (
          <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-[#c4d4e4] rounded-lg z-10 shadow-md overflow-hidden">
            {[
              { section: 'Recent searches',     items: ['leave policy 2026', 'Q4 budget xlsx'] },
              { section: 'Trending in Contoso', items: ['Q1 forecast', 'expense reimbursement form'] },
              { section: 'Documents',           items: ['Leave Policy 2026.docx \u2014 HR', 'Leave Tracker.xlsx \u2014 Finance'] },
            ].map(({ section, items }) => (
              <div key={section}>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-gray-400 bg-gray-50 border-t border-[#e8eef4]">
                  {section}
                </div>
                {items.map((item) => (
                  <div key={item} className="px-3 py-2 text-[13px] text-[#0d3b66] cursor-pointer hover:bg-[#f3f8fd] transition-colors">
                    {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <SectionTitle>How suggestions work</SectionTitle>
      <div className="flex flex-col gap-2">
        {[
          { n: '1', bg: 'bg-blue-100 text-blue-800',   title: 'Your recent searches',  desc: 'Last 50 searches surfaced instantly' },
          { n: '2', bg: 'bg-amber-100 text-amber-800', title: 'Trending in your org',   desc: 'Most popular searches this week across all users' },
          { n: '3', bg: 'bg-green-100 text-green-800', title: 'Document title matches', desc: 'Live file name matches as you type' },
        ].map((item) => (
          <div key={item.n} className="flex gap-2.5 p-2.5 border border-[#e8eef4] rounded-lg">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${item.bg}`}>
              {item.n}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#0d3b66]">{item.title}</p>
              <p className="text-[12px] text-gray-400">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CollectionsPanel() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#0d3b66]">Collections</h2>
      <p className="text-sm text-gray-400 mb-4">Group related documents into named collections for quick access</p>
      <div className="flex flex-col gap-2">
        {collections.map((col) => (
          <div key={col.name} className="p-3 border border-[#e8eef4] rounded-lg cursor-pointer hover:bg-[#f3f8fd] transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center text-sm shrink-0">{'\ud83d\udcc1'}</div>
              <div>
                <p className="text-[13px] font-semibold text-[#0d3b66]">{col.name}</p>
                <p className="text-[11px] text-gray-400">{col.count}</p>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {col.docs.map((d) => (
                <span key={d} className="text-[10px] px-1.5 py-0.5 bg-[#f3f8fd] border border-[#e8eef4] rounded text-gray-500">{d}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="w-full mt-3 py-2 text-[13px] border border-dashed border-[#c4d4e4] rounded-lg text-gray-400 hover:bg-[#f3f8fd] hover:text-[#0d3b66] transition-colors">
        + Create new collection
      </button>
    </div>
  )
}

function PinnedPanel() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#0d3b66]">Pinned searches</h2>
      <p className="text-sm text-gray-400 mb-4">Get notified when new results appear for your saved queries</p>
      <div className="flex flex-col gap-2">
        {pinnedItems.map((item) => (
          <div key={item.query} className="flex items-center gap-2.5 p-2.5 border border-[#e8eef4] rounded-lg cursor-pointer hover:bg-[#f3f8fd] transition-colors">
            <span className="text-base shrink-0">{'\ud83d\udccc'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#0d3b66] truncate">{item.query}</p>
              <p className="text-[11px] text-gray-400">{item.meta}</p>
            </div>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${badgeClasses[item.badgeVariant]} ${item.pulse ? 'animate-pulse' : ''}`}>
              {item.badge}
            </span>
          </div>
        ))}
      </div>
      <button className="w-full mt-3 py-2 text-[13px] border border-dashed border-[#c4d4e4] rounded-lg text-gray-400 hover:bg-[#f3f8fd] hover:text-[#0d3b66] transition-colors">
        + Pin a new search
      </button>
    </div>
  )
}

function FavouritesPanel() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#0d3b66]">Favourites</h2>
      <p className="text-sm text-gray-400 mb-4">Documents you have starred for quick access</p>
      <div className="flex flex-col gap-2">
        {favouriteDocs.map((doc) => <DocRow key={doc.name} doc={doc} />)}
      </div>
      <button className="w-full mt-3 py-2 text-[13px] border border-dashed border-[#c4d4e4] rounded-lg text-gray-400 hover:bg-[#f3f8fd] hover:text-[#0d3b66] transition-colors">
        + Add a favourite
      </button>
    </div>
  )
}

function RecentPanel() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#0d3b66]">Recent</h2>
      <p className="text-sm text-gray-400 mb-4">Documents you have opened recently</p>
      <div className="flex flex-col gap-2">
        {allRecentDocs.map((doc) => <DocRow key={doc.name} doc={doc} />)}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DailyFeaturesMockup() {
  const [activeNav, setActiveNav] = useState<NavId>('home')

  const panelTitles: Record<NavId, string> = {
    home:        'Home',
    search:      'Smart search',
    collections: 'Collections',
    pinned:      'Pinned searches',
    favourites:  'Favourites',
    recent:      'Recent',
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="border border-[#d0d8e0] rounded-xl overflow-hidden bg-white flex min-h-[620px]">

        {/* ── Vertical icon toolbar ─────────────────────────────────────── */}
        <aside className="w-16 bg-[#0d3b66] flex flex-col items-center py-4 gap-1 shrink-0">

          {/* Logo mark */}
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mb-4 shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6" cy="6" r="5" stroke="white" strokeWidth="1.4" />
              <path d="M10 10l4 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>

          {/* Nav items */}
          {navItems.map((item) => {
            const isActive = activeNav === item.id
            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => setActiveNav(item.id)}
                  className={`
                    relative w-10 h-10 rounded-xl flex items-center justify-center
                    transition-all duration-150 cursor-pointer
                    ${isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/50 hover:bg-white/10 hover:text-white/80'
                    }
                  `}
                >
                  {item.icon(isActive)}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-r-full" />
                  )}
                </button>

                {/* Tooltip */}
                <div className="
                  absolute left-full top-1/2 -translate-y-1/2 ml-3
                  bg-gray-800 text-white text-[11px] font-medium
                  px-2 py-1 rounded whitespace-nowrap
                  opacity-0 group-hover:opacity-100 pointer-events-none
                  transition-opacity duration-150 z-50
                ">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
                </div>
              </div>
            )
          })}

          {/* User avatar */}
          <div className="mt-auto w-8 h-8 rounded-full bg-[#1976d2] flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
            AS
          </div>
        </aside>

        {/* ── Content area ──────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e8eef4] bg-white">
            <div>
              <h1 className="text-[15px] font-semibold text-[#0d3b66]">{panelTitles[activeNav]}</h1>
              <p className="text-[11px] text-gray-400">Contoso Ltd \u00b7 Alice Smith</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-[11px] text-gray-400">Connected</span>
            </div>
          </div>

          {/* Active panel */}
          <div className="flex-1 overflow-auto p-5">
            {activeNav === 'home'        && <HomePanel />}
            {activeNav === 'search'      && <SearchPanel />}
            {activeNav === 'collections' && <CollectionsPanel />}
            {activeNav === 'pinned'      && <PinnedPanel />}
            {activeNav === 'favourites'  && <FavouritesPanel />}
            {activeNav === 'recent'      && <RecentPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}

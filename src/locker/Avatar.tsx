import { ITEMS_BY_ID, type Equip } from './model'

/*
 * The avatar: a stamped little golfer plus an emblem crest, both painted from
 * the equipped cosmetics. Pure SVG so it scales crisply on a locker card, a
 * leaderboard row, or a header chip.
 */

const SKIN = '#e0b48c'
const SHORTS = '#cbb88f'
const SHOE = '#26312b'

function colorOf(equip: Equip, slot: keyof Equip): string {
  return ITEMS_BY_ID[equip[slot]]?.color ?? '#f2f0e6'
}

export function Golfer({ equip, className }: { equip: Equip; className?: string }) {
  const cap = colorOf(equip, 'cap')
  const shirt = colorOf(equip, 'shirt')
  const club = colorOf(equip, 'club')
  const ball = colorOf(equip, 'ball')

  return (
    <svg viewBox="0 0 120 176" className={className} aria-hidden="true">
      <ellipse cx="60" cy="168" rx="30" ry="5" fill="rgba(0,0,0,.22)" />
      {/* club, held to the right and behind the body */}
      <line x1="82" y1="104" x2="103" y2="150" stroke="#3a2f22" strokeWidth="3.4" strokeLinecap="round" />
      <line x1="82" y1="104" x2="103" y2="150" stroke={club} strokeWidth="2" strokeLinecap="round" />
      <path d="M100 150 L112 150 L110 156 L101 156 Z" fill={club} />
      {/* shoes */}
      <ellipse cx="49" cy="160" rx="11" ry="5.5" fill={SHOE} />
      <ellipse cx="71" cy="160" rx="11" ry="5.5" fill={SHOE} />
      {/* lower legs */}
      <rect x="43" y="138" width="11" height="20" rx="4" fill={SKIN} />
      <rect x="66" y="138" width="11" height="20" rx="4" fill={SKIN} />
      {/* shorts */}
      <path d="M40 116 L80 116 L78 140 L64 140 L60 122 L56 140 L42 140 Z" fill={SHORTS} />
      {/* shirt torso */}
      <path d="M41 80 Q41 74 48 73 L72 73 Q79 74 79 80 L82 116 L38 116 Z" fill={shirt} />
      <path d="M52 74 L60 82 L68 74 L64 73 L56 73 Z" fill="rgba(0,0,0,.12)" />
      {/* arms + hands */}
      <rect x="33" y="80" width="10" height="30" rx="5" fill={shirt} />
      <rect x="77" y="80" width="10" height="26" rx="5" fill={shirt} />
      <rect x="33" y="104" width="9" height="12" rx="4.5" fill={SKIN} />
      <rect x="78" y="100" width="9" height="12" rx="4.5" fill={SKIN} />
      {/* head */}
      <circle cx="60" cy="58" r="15.5" fill={SKIN} />
      {/* cap */}
      <path d="M45 55 Q46 40 60 40 Q74 40 75 55 Z" fill={cap} />
      <path d="M45 55 Q40 55 36 58 Q45 60 60 59 Z" fill={cap} />
      <circle cx="60" cy="42" r="2" fill="rgba(0,0,0,.16)" />
      {/* ball at the feet */}
      <circle cx="30" cy="156" r="5" fill={ball} />
      <circle cx="28" cy="154" r="1.4" fill="rgba(255,255,255,.6)" />
    </svg>
  )
}

export function Crest({ equip, className }: { equip: Equip; className?: string }) {
  const col = colorOf(equip, 'crest')
  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden="true">
      <path
        d="M50 4 L92 18 L92 58 Q92 90 50 106 Q8 90 8 58 L8 18 Z"
        fill={col}
        stroke="rgba(0,0,0,.25)"
        strokeWidth="2"
      />
      <path
        d="M50 4 L92 18 L92 58 Q92 90 50 106 Q8 90 8 58 L8 18 Z"
        fill="none"
        stroke="rgba(255,255,255,.32)"
        strokeWidth="1.5"
        transform="scale(.86) translate(8,9)"
      />
      {/* a flag on the pin */}
      <line x1="50" y1="34" x2="50" y2="74" stroke="#f2f0e6" strokeWidth="3" strokeLinecap="round" />
      <path d="M50 36 Q62 33 70 37 Q66 44 70 51 Q62 47 50 50 Z" fill="#f2f0e6" />
      <circle cx="50" cy="76" r="3" fill="#f2f0e6" />
    </svg>
  )
}

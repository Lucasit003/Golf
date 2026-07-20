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
    <svg viewBox="0 0 120 180" className={className} aria-hidden="true">
      <ellipse cx="60" cy="171" rx="30" ry="5" fill="rgba(0,0,0,.24)" />
      {/* club, held head-down at the right */}
      <line x1="84" y1="108" x2="106" y2="150" stroke="#3a2f22" strokeWidth="3.6" strokeLinecap="round" />
      <line x1="84" y1="108" x2="106" y2="150" stroke={club} strokeWidth="2" strokeLinecap="round" />
      <path d="M103 150 L115 150 L113 156 L104 156 Z" fill={club} />
      {/* shoes */}
      <ellipse cx="49" cy="161" rx="11" ry="5.5" fill={SHOE} />
      <ellipse cx="71" cy="161" rx="11" ry="5.5" fill={SHOE} />
      {/* lower legs */}
      <rect x="43" y="139" width="11" height="20" rx="4" fill={SKIN} />
      <rect x="66" y="139" width="11" height="20" rx="4" fill={SKIN} />
      {/* shorts */}
      <path d="M40 117 L80 117 L78 141 L64 141 L60 123 L56 141 L42 141 Z" fill={SHORTS} />
      {/* shirt torso, tapered */}
      <path d="M42 82 Q42 74 50 73 L70 73 Q78 74 78 82 L82 117 L38 117 Z" fill={shirt} />
      {/* collar, placket, buttons */}
      <path d="M53 74 L60 83 L67 74 L63 73 L57 73 Z" fill="rgba(0,0,0,.13)" />
      <line x1="60" y1="83" x2="60" y2="104" stroke="rgba(0,0,0,.12)" strokeWidth="1.4" />
      <circle cx="60" cy="90" r="1.1" fill="rgba(0,0,0,.2)" />
      <circle cx="60" cy="97" r="1.1" fill="rgba(0,0,0,.2)" />
      {/* arms, slightly bent, with hands */}
      <path d="M40 82 Q33 90 35 104 L40 104 Q40 92 44 84 Z" fill={shirt} />
      <path d="M78 82 Q85 90 84 102 L79 102 Q79 92 74 84 Z" fill={shirt} />
      <rect x="33" y="102" width="9" height="12" rx="4.5" fill={SKIN} />
      <rect x="79" y="100" width="9" height="12" rx="4.5" fill={SKIN} />
      {/* head + ears */}
      <circle cx="60" cy="57" r="16.5" fill={SKIN} />
      <circle cx="44.5" cy="57" r="2.5" fill={SKIN} />
      <circle cx="75.5" cy="57" r="2.5" fill={SKIN} />
      {/* cap */}
      <path d="M44 54 Q45 38 60 38 Q75 38 76 54 Z" fill={cap} />
      <path d="M44 54 Q37 54 33 58 Q45 60 60 58 Z" fill={cap} />
      <circle cx="60" cy="40" r="2" fill="rgba(0,0,0,.16)" />
      {/* ball at the feet */}
      <circle cx="30" cy="157" r="5" fill={ball} />
      <circle cx="28" cy="155" r="1.3" fill="rgba(255,255,255,.6)" />
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

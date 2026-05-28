export default function Icon({ name, size = 14 }) {
  const s = { width: size, height: size, display: 'block', flexShrink: 0 }
  const sw = 1.6
  const sc = 'currentColor'
  switch (name) {
    case 'bar':   return <svg {...s} viewBox="0 0 16 16" fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round"><line x1="3" y1="13" x2="3" y2="9"/><line x1="8" y1="13" x2="8" y2="5"/><line x1="13" y1="13" x2="13" y2="7"/></svg>
    case 'area':  return <svg {...s} viewBox="0 0 16 16" fill="none" stroke={sc} strokeWidth={sw} strokeLinejoin="round"><path d="M2 12 L5 7 L8 9 L11 4 L14 8 L14 13 L2 13 Z" fill="currentColor" fillOpacity=".18"/></svg>
    case 'line':  return <svg {...s} viewBox="0 0 16 16" fill="none" stroke={sc} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round"><path d="M2 12 L5 7 L8 9 L11 4 L14 8"/></svg>
    case 'rain':  return <svg {...s} viewBox="0 0 16 16" fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round"><path d="M4 9 c0 -3 2 -5 4 -5 s4 2 4 5"/><line x1="5" y1="12" x2="5" y2="14"/><line x1="8" y1="12" x2="8" y2="14.5"/><line x1="11" y1="12" x2="11" y2="14"/></svg>
    case 'temp':  return <svg {...s} viewBox="0 0 16 16" fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round"><rect x="6" y="2" width="4" height="8" rx="2"/><circle cx="8" cy="12" r="2.2"/></svg>
    case 'drop':  return <svg {...s} viewBox="0 0 16 16" fill="none" stroke={sc} strokeWidth={sw} strokeLinejoin="round"><path d="M8 2 L11.5 7 c1 2 0 5 -3.5 5 s-4.5 -3 -3.5 -5 Z"/></svg>
    case 'map':   return <svg {...s} viewBox="0 0 16 16" fill="none" stroke={sc} strokeWidth={sw} strokeLinejoin="round"><path d="M2 4 L6 2 L10 4 L14 2 L14 12 L10 14 L6 12 L2 14 Z"/><line x1="6" y1="2" x2="6" y2="12"/><line x1="10" y1="4" x2="10" y2="14"/></svg>
    case 'chart': return <svg {...s} viewBox="0 0 16 16" fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round"><polyline points="2 11 6 6 9 9 14 3"/><circle cx="6" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="14" cy="3" r="1.2" fill="currentColor"/></svg>
    case 'loc':   return <svg {...s} viewBox="0 0 16 16" fill="none" stroke={sc} strokeWidth={sw}><path d="M8 14 C 4 10 3 7 3 6 a 5 5 0 1 1 10 0 c 0 1 -1 4 -5 8 Z"/><circle cx="8" cy="6" r="1.5"/></svg>
    case 'menu':  return <svg {...s} viewBox="0 0 16 16" fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>
    case 'close': return <svg {...s} viewBox="0 0 16 16" fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
    default: return null
  }
}

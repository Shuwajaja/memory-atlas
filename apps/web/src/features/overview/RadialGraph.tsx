import { topicCount, type TopicId, type VisualCard } from './reference-demo';

const PATHS = [
  'M395 213Q270 120 184 111',
  'M395 213Q475 107 600 112',
  'M395 213Q565 241 645 325',
  'M395 213Q271 246 175 323',
  'M395 213Q397 307 404 366',
  'M395 213Q358 123 381 54',
  'M184 111Q263 36 381 54',
  'M600 112Q605 213 645 325',
];

const NODES: readonly [TopicId | 'all', number, number, number, string][] = [
  ['all', 395, 213, 39, 'MEMORY'],
  ['agents', 184, 111, 28, 'Agenten'],
  ['projects', 600, 112, 29, 'Projekte'],
  ['design', 645, 325, 24, 'Design'],
  ['infra', 175, 323, 26, 'Infrastruktur'],
  ['business', 404, 366, 22, 'Business'],
  ['memory', 381, 54, 20, 'Wissen'],
];

export function RadialGraph({ cards, onOpen }: { cards: readonly VisualCard[]; onOpen: (topic: TopicId | 'all') => void }) {
  return (
    <div className="graph-holder">
      <svg className="graph-svg" viewBox="0 0 800 438" role="group" aria-label="Interaktiver Wissensgraph mit verknüpften Themen Agenten, Projekte, Design, Infrastruktur und Memory">
        <defs>
          <pattern id="gridDots" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1.4" cy="1.4" r=".8" fill="#2b4e4c" />
          </pattern>
          <radialGradient id="graphGlow">
            <stop stopColor="#34675C" stopOpacity=".28" />
            <stop offset="1" stopColor="#0E1920" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="800" height="438" fill="url(#gridDots)" opacity=".5" />
        <circle cx="395" cy="213" r="210" fill="url(#graphGlow)" />
        {PATHS.map((path, index) => (
          <path key={path} className={index < 5 ? 'graph-line strong' : 'graph-line'} d={path} />
        ))}
        <circle r="3.2" className="graph-animated-dot">
          <animateMotion dur="9s" repeatCount="indefinite" path="M395 213Q475 107 600 112" />
        </circle>
        <circle r="3" className="graph-animated-dot">
          <animateMotion dur="13s" repeatCount="indefinite" path="M184 111Q270 120 395 213" />
        </circle>
        {NODES.map(([topic, x, y, radius, label], index) => {
          const strong = index === 0;
          const count = topicCount(cards, topic);
          return (
            <g
              key={topic}
              className="graph-node"
              role="button"
              tabIndex={0}
              aria-label={`${label}${count} Bereiche`}
              onClick={() => onOpen(topic)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onOpen(topic);
              }}
            >
              {strong ? <circle className="graph-pulse" cx={x} cy={y} r={radius + 21} /> : null}
              <circle className="node-outline" cx={x} cy={y} r={radius} fill={strong ? '#225646' : '#162a2a'} />
              <circle cx={x} cy={y} r={strong ? 9 : 5} fill={strong ? '#9FECCE' : '#69b49d'} fillOpacity=".2" stroke="#7BDDBB" />
              <text className="node-label" x={x} y={y + radius + 18}>{label}</text>
              <text className="node-sublabel" x={x} y={y + radius + 31}>{count} Bereiche</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

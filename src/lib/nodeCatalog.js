import {
  Boxes,
  Cloud,
  Database,
  Gauge,
  Globe,
  KeyRound,
  Layers,
  Monitor,
  Radio,
  Server,
  Workflow,
  Zap,
} from 'lucide-react';

export const NODE_CATALOG = {
  sticky: {
    label: 'Sticky Note',
    description: 'A shared text note that multiple users can edit',
    icon: Layers,
    accent: '#facc15',
    tint: 'rgba(250,204,21,0.12)',
    defaultLabel: 'New note',
    group: 'Notes',
  },
  client: {
    label: 'Client',
    description: 'Browser, mobile app or external consumer',
    icon: Monitor,
    accent: '#38bdf8',
    tint: 'rgba(56,189,248,0.12)',
    defaultLabel: 'Web Client',
    group: 'Edge',
  },
  frontend: {
    label: 'Frontend',
    description: 'React / SPA application',
    icon: Globe,
    accent: '#818cf8',
    tint: 'rgba(129,140,248,0.12)',
    defaultLabel: 'Web App',
    group: 'Edge',
  },
  gateway: {
    label: 'API Gateway',
    description: 'Routing, TLS, rate limiting',
    icon: Gauge,
    accent: '#fbbf24',
    tint: 'rgba(251,191,36,0.12)',
    defaultLabel: 'API Gateway',
    group: 'Edge',
  },
  service: {
    label: 'Service',
    description: 'Business capability / microservice',
    icon: Server,
    accent: '#22d3ee',
    tint: 'rgba(34,211,238,0.12)',
    defaultLabel: 'New Service',
    group: 'Compute',
  },
  worker: {
    label: 'Worker',
    description: 'Background job consumer',
    icon: Workflow,
    accent: '#fb923c',
    tint: 'rgba(251,146,60,0.12)',
    defaultLabel: 'Background Worker',
    group: 'Compute',
  },
  auth: {
    label: 'Auth',
    description: 'Identity, sessions, tokens',
    icon: KeyRound,
    accent: '#a78bfa',
    tint: 'rgba(167,139,250,0.12)',
    defaultLabel: 'Auth Service',
    group: 'Compute',
  },
  database: {
    label: 'Database',
    description: 'Durable transactional state',
    icon: Database,
    accent: '#34d399',
    tint: 'rgba(52,211,153,0.12)',
    defaultLabel: 'MongoDB',
    group: 'Data',
  },
  cache: {
    label: 'Cache',
    description: 'Low-latency read cache',
    icon: Zap,
    accent: '#fb7185',
    tint: 'rgba(251,113,133,0.12)',
    defaultLabel: 'Redis Cache',
    group: 'Data',
  },
  queue: {
    label: 'Queue',
    description: 'Async messaging / event bus',
    icon: Radio,
    accent: '#c084fc',
    tint: 'rgba(192,132,252,0.12)',
    defaultLabel: 'Event Queue',
    group: 'Data',
  },
  storage: {
    label: 'Object Storage',
    description: 'Files, blobs, media',
    icon: Layers,
    accent: '#2dd4bf',
    tint: 'rgba(45,212,191,0.12)',
    defaultLabel: 'Object Storage',
    group: 'Data',
  },
  external: {
    label: 'External API',
    description: 'Third-party dependency',
    icon: Cloud,
    accent: '#94a3b8',
    tint: 'rgba(148,163,184,0.12)',
    defaultLabel: 'External API',
    group: 'External',
  },
};

export const NODE_TYPES = Object.keys(NODE_CATALOG);

export const TOOLBAR_GROUPS = [
  { name: 'Notes', types: ['sticky'] },
  { name: 'Edge', types: ['client', 'frontend', 'gateway'] },
  { name: 'Compute', types: ['service', 'worker', 'auth'] },
  { name: 'Data', types: ['database', 'cache', 'queue', 'storage'] },
  { name: 'External', types: ['external'] },
];

export const EDGE_KINDS = {
  sync: { label: 'Synchronous', color: '#64748b', dash: undefined },
  async: { label: 'Asynchronous', color: '#c084fc', dash: '7 5' },
  data: { label: 'Data flow', color: '#34d399', dash: '2 4' },
};

export const catalogEntry = (type) => NODE_CATALOG[type] ?? NODE_CATALOG.service;

export const SEVERITY_STYLES = {
  critical: { label: 'Critical', className: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  high: { label: 'High', className: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  medium: { label: 'Medium', className: 'bg-amber-500/15 text-amber-200 border-amber-500/30' },
  low: { label: 'Low', className: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
};

export const RATING_LABELS = {
  solid: 'Solid',
  reasonable: 'Reasonable',
  'needs-work': 'Needs work',
  'at-risk': 'At risk',
  empty: 'Empty board',
};

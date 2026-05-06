const PROJECTS = [
  { id: 'p1', name: 'Onboarding', status: 'active' },
  { id: 'p2', name: 'Migration',  status: 'paused' },
];

export interface ProjectListProps {
  onOpen?: (id: string) => void;
}

export function ProjectList({ onOpen }: ProjectListProps) {
  return (
    <ul>
      {PROJECTS.map(p => (
        <li key={p.id} onClick={() => onOpen?.(p.id)}>
          {p.name} — {p.status}
        </li>
      ))}
    </ul>
  );
}

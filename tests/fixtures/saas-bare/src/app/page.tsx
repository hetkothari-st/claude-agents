import { ProjectList } from '@/components/ProjectList';

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <ProjectList />
    </main>
  );
}

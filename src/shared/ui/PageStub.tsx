import { useTranslation } from 'react-i18next';
interface Props {
  title: string;
  description?: string;
  todos: string[];
}

export function PageStub({ title, description, todos }: Props) {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      {description && <p className="text-secondary mb-6">{description}</p>}
      <div className="rounded-lg border border-default bg-surface p-6">
        <p className="text-sm text-muted mb-4">
          Эта страница в разработке. Запланированные фичи:
        </p>
        <ul className="space-y-2">
          {todos.map((todo, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-secondary">
              <span className="text-gray-600 mt-0.5">☐</span>
              {todo}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

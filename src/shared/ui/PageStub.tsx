interface Props {
  title: string;
  description?: string;
  todos: string[];
}

export function PageStub({ title, description, todos }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      {description && <p className="text-gray-400 mb-6">{description}</p>}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <p className="text-sm text-gray-500 mb-4">
          Эта страница в разработке. Запланированные фичи:
        </p>
        <ul className="space-y-2">
          {todos.map((todo, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
              <span className="text-gray-600 mt-0.5">☐</span>
              {todo}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

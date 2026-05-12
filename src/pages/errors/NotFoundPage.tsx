import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-bold text-muted mb-4">404</h1>
      <p className="text-secondary mb-6">Страница не найдена</p>
      <Link to="/" className="text-blue-400 hover:text-blue-300 underline">
        Вернуться на главную
      </Link>
    </div>
  );
}

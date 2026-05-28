import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export default function ForbiddenPage() {
  const { t } = useTranslation();
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-bold text-muted mb-4">403</h1>
      <p className="text-secondary mb-6">Доступ запрещён. У вас нет прав для просмотра этой страницы.</p>
      <Link to="/" className="text-blue-400 hover:text-blue-300 underline">
        Вернуться на дашборд
      </Link>
    </div>
  );
}

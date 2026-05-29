import { useTranslation } from 'react-i18next';
import { PageStub } from '@/shared/ui/PageStub';

export default function BuildingMapPage() {
  const { t } = useTranslation();
  return (
    <PageStub
      title="Карта здания"
      todos={[
        'Интерактивная карта по этажам',
        'План этажа (SVG/изображение)',
        'Кликабельные точки: столы (зелёный/красный/жёлтый), залы, туалеты, кухни, лифты, офисы',
        'Клик на ресурс → бронирование',
        'Клик на офис → информация о компании',
        'Переключение между этажами',
        'Поиск на карте',
        'Интеграция с GET /api/v1/building/floors/',
      ]}
    />
  );
}

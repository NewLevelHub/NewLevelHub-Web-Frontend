import { PageStub } from '@/shared/ui/PageStub';

export default function BookingCatalogPage() {
  return (
    <PageStub
      title="Бронирование ресурсов"
      description="Каталог ресурсов БЦ"
      todos={[
        'Фильтры: тип (стол/зал/парковка/капсула), этаж, вместимость, оборудование',
        'Фильтр по дате и времени — только свободные',
        'Карточки ресурсов: фото, название, этаж, характеристики, статус',
        'Переключение вид «карточки» / «на карте»',
        'Быстрый поиск по названию',
        'Клик → /bookings/new?resource=:id',
        'Интеграция с GET /api/v1/resources/',
      ]}
    />
  );
}

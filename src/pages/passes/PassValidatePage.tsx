import { PageStub } from '@/shared/ui/PageStub';

export default function PassValidatePage() {
  return (
    <PageStub
      title="Проверка пропуска"
      description="Валидация QR на ресепшн (суперадмин)"
      todos={[
        'Сканирование QR через камеру',
        'Или ручной ввод кода',
        'Результат: валидный (имя, кто пригласил, цель) / невалидный',
        'Ручная отметка прохода',
        'Интеграция с GET /api/v1/access/passes/validate/:code/',
      ]}
    />
  );
}

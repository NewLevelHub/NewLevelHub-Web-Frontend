import { useMapLogic } from '@/pages/map/hooks/useMapLogic';
import { MapPageLayout } from '@/pages/map/components/MapPageLayout';

export default function MapPage() {
  const logic = useMapLogic();
  return <MapPageLayout {...logic} />;
}

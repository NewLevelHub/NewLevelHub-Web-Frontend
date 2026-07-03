import { useParams } from 'react-router';
import CompanyHubPage from '@/pages/company/CompanyHubPage';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <CompanyHubPage companyId={id} />;
}

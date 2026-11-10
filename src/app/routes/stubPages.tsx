import { useParams } from 'react-router-dom';
import { PagePlaceholder } from '@/components/PagePlaceholder/PagePlaceholder';
import { strings } from '@/content/strings';

export const CaseSearchPage = () => <PagePlaceholder title={strings.pages.caseSearch.title} milestone="M6" />;
export function CaseDetailPage() {
  const { id = '' } = useParams();
  return <PagePlaceholder title={strings.pages.caseDetail.title(id)} milestone="M6" />;
}
export const VeteranProfilePage = () => <PagePlaceholder title={strings.pages.veteran.title} milestone="M3" />;
export const ProviderProfilePage = () => <PagePlaceholder title={strings.pages.provider.title} milestone="M3" />;
export const DocumentPage = () => <PagePlaceholder title={strings.pages.document.title} milestone="M8" />;
export const AdminPage = () => <PagePlaceholder title={strings.pages.admin.title} milestone="M9" />;

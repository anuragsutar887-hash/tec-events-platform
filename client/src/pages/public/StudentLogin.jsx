import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudent } from '../../context/StudentAuthContext';
import StudentLoginModal from '../../components/auth/StudentLoginModal';

export default function StudentLogin() {
  const { isAuthenticated } = useStudent();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirect);
    }
  }, [isAuthenticated, navigate, redirect]);

  return (
    <div className="container section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <StudentLoginModal
        isOpen={true}
        onClose={() => navigate(redirect.includes('/register') ? '/' : redirect)}
        onSuccess={() => navigate(redirect)}
      />
    </div>
  );
}

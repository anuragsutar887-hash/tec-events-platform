import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { teacherService } from '../../services/teacherService';

export default function TeacherProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const location = useLocation();

  useEffect(() => {
    teacherService.getCurrentTeacher().then((t) => {
      setTeacher(t);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="skeleton" style={{ width: '280px', height: '40px' }} />
      </div>
    );
  }

  if (!teacher) {
    return <Navigate to="/teacher/login" state={{ from: location }} replace />;
  }

  return children;
}

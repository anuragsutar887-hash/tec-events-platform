import { createContext, useContext } from 'react';
import { useStudentAuth } from '../hooks/useStudentAuth';

const StudentAuthContext = createContext(null);

export function StudentAuthProvider({ children }) {
  const auth = useStudentAuth();
  return (
    <StudentAuthContext.Provider value={auth}>
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudent() {
  const context = useContext(StudentAuthContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentAuthProvider');
  }
  return context;
}

import { Navigate, Route, Routes } from 'react-router-dom';
import RecruiterLayout from './pages/RecruiterLayout';
import InterviewsList from './pages/InterviewsList';
import InterviewCreate from './pages/InterviewCreate';
import InterviewDetail from './pages/InterviewDetail';
import QuestionBank from './pages/QuestionBank';
import InterviewConduct from './pages/InterviewConduct';
import ScreeningList from './pages/ScreeningList';
import ScreeningCreate from './pages/ScreeningCreate';
import ScreeningDetail from './pages/ScreeningDetail';
import Landing from './pages/Landing';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/recruiter" element={<RecruiterLayout />}>
        <Route index element={<InterviewsList />} />
        <Route path="new" element={<InterviewCreate />} />
        <Route path="questions" element={<QuestionBank />} />
        <Route path="screening" element={<ScreeningList />} />
        <Route path="screening/new" element={<ScreeningCreate />} />
        <Route path="screening/:id" element={<ScreeningDetail />} />
        <Route path=":id" element={<InterviewDetail />} />
        <Route path=":id/conduct" element={<InterviewConduct />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

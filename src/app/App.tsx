import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthProvider } from '../auth/AuthProvider'
import Layout from '../layout/Layout'
import Login from '../auth/Login'
import ActivationPage from '../auth/ActivationPage'
import IssueAccountPage from '../features/admin/IssueAccountPage'
import AwaitingReleasePage from '../features/production/AwaitingReleasePage'
import { Toaster } from '../layout/toast'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/activate" element={<ActivationPage />} />
          <Route element={<Layout />}>
            <Route path="/admin/users" element={<IssueAccountPage />} />
            <Route path="/awaiting-release" element={<AwaitingReleasePage />} />
            <Route path="*" element={<p>준비 중</p>} />
          </Route>
        </Routes>
      </AuthProvider>
      <Toaster />
    </BrowserRouter>
  )
}

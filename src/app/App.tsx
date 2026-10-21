import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthProvider } from '../auth/AuthProvider'
import Layout from '../layout/Layout'
import Login from '../auth/Login'
import ActivationPage from '../auth/ActivationPage'
import { Toaster } from '../layout/toast'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/activate" element={<ActivationPage />} />
          <Route path="*" element={<Layout />} />
        </Routes>
      </AuthProvider>
      <Toaster />
    </BrowserRouter>
  )
}

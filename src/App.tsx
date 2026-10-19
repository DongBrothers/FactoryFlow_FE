import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './auth'
import Layout from './Layout'
import Login from './Login'
import { Toaster } from './toast'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Layout />} />
        </Routes>
      </AuthProvider>
      <Toaster />
    </BrowserRouter>
  )
}

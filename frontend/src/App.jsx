import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import AppLayout from './components/layout/AppLayout'
import MarketingLayout from './components/layout/MarketingLayout'
import ErrorBoundary from './components/shared/ErrorBoundary'
import { TicketsProvider } from './context/TicketsContext'
import AnalyticsPage from './pages/AnalyticsPage'
import BillingPage from './pages/BillingPage'
import DashboardPage from './pages/DashboardPage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import PricingPage from './pages/PricingPage'
import PrivacyPage from './pages/PrivacyPage'
import SignupPage from './pages/SignupPage'
import TermsPage from './pages/TermsPage'
import TicketDetailPage from './pages/TicketDetailPage'
import TicketsListPage from './pages/TicketsListPage'

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Route>
        </Routes>

        <TicketsProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
              <Route path="/tickets" element={<ErrorBoundary><TicketsListPage /></ErrorBoundary>} />
              <Route path="/tickets/:id" element={<ErrorBoundary><TicketDetailPage /></ErrorBoundary>} />
              <Route path="/knowledge-base" element={<ErrorBoundary><KnowledgeBasePage /></ErrorBoundary>} />
              <Route path="/analytics" element={<ErrorBoundary><AnalyticsPage /></ErrorBoundary>} />
              <Route path="/billing" element={<ErrorBoundary><BillingPage /></ErrorBoundary>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </TicketsProvider>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 2600 }} />
    </>
  )
}

export default App
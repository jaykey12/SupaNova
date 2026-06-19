import { Outlet } from 'react-router-dom'
import Navbar from '../marketing/Navbar'
import Footer from '../marketing/Footer'

export default function MarketingLayout() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main><Outlet /></main>
      <Footer />
    </div>
  )
}
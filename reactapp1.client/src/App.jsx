// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "./components/Header";
import ProfilePage from "./pages/ProfilePage.jsx";
import ManagePage from "./pages/ManagePage.jsx";
import ManageCreateEventPage from "./pages/ManageCreateEventPage.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Home from "./pages/Home.jsx";
import EventsPage from "./pages/EventsPage.jsx";
import EventDetailPage from "./pages/EventPage";
//import Loading from "./components/Loading";
import BackToTopFancy from "./components/TopButton";
import Footer from "./components/Footer";
import FAQ from "./pages/FAQ";
import Support from "./pages/Support";
import Policies from "./pages/Policies";
import "./styles.css";

export default function App() {
  // const [loading, setLoading] = useState(true);
  // useEffect(() => {
  //   setTimeout(() => setLoading(false), 3300);
  // }, []);
  // if (loading) {
  //   return <Loading />;
  // }

  return (
    <BrowserRouter>
      <Header />
      <Routes>
        {/* 首页和用户视角 */}
        <Route path="/" element={<Home />} />
        <Route path="/:userId" element={<Home />} />

        {/* 活动相关 */}
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />

        {/* 用户/登录 */}
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/login" element={<Login />} />

        {/* 管理 */}
        <Route path="/manage" element={<ManagePage />} />
        <Route path="/manage/create" element={<ManageCreateEventPage />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* 404 */}
        <Route path="*" element={<div style={{ padding: 12 }}>Not found</div>} />

        {/* HELP */}
        <Route path="/faq" element={<FAQ />} />
        <Route path="/support" element={<Support />} />
        <Route path="/policies" element={<Policies />} />
      </Routes>

      <Footer />                         {/* ✅ 新增：全站底部 */}
      <BackToTopFancy threshold={20} />  {/* 浮动回顶按钮放在最后，覆盖在页面上 */}
    </BrowserRouter>
  );
}

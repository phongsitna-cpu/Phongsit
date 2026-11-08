// src/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

function Dashboard() {
  const navigate = useNavigate();
  
  const [totalReportedPosts, setTotalReportedPosts] = useState(0);
  const [severeReportedPosts, setSevereReportedPosts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummaryData = async () => {
      setIsLoading(true);
      try {
        // ดึงข้อมูลการรายงานจริงจาก Backend
        const response = await axios.get(`${API_BASE_URL}/api/admin/reports`);
        const reportsData = Array.isArray(response.data) ? response.data : [];

        // คำนวณจำนวนโพสต์ที่ถูกรายงานทั้งหมด
        const total = reportsData.length; 
        
        // คำนวณเฉพาะโพสต์ที่ถูกรายงาน > 3 ครั้ง
        const severe = reportsData.filter(post => (post.reportCount || post.report_count || 0) > 3).length;

        setTotalReportedPosts(total);
        setSevereReportedPosts(severe);
      } catch (error) {
        console.error("ดึงข้อมูลสรุปไม่สำเร็จ:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaryData();
  }, []);

  return (
    <div className="h-screen w-full flex flex-col font-sans bg-white">
      {/* Header */}
      <header className="h-16 bg-[#b0cde2] flex items-center px-6 border-b border-gray-400">
        <h1 className="text-2xl font-bold text-[#4a85e8] drop-shadow-sm ml-4">
          AI Manga Diary Admin
        </h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-[#e6f2ff] flex flex-col border-r border-gray-300">
          <div className="bg-[#4a85e8] text-white py-3 text-lg font-medium text-center border-b border-gray-400">
            เมนู
          </div>
          <nav className="flex-1 flex flex-col py-4">
            <button className="text-left px-8 py-3 text-gray-800 font-medium bg-[#e6f2ff] hover:bg-white transition-colors cursor-default">
              ดูสรุปการรายงาน
            </button>
            <button 
              onClick={() => navigate('/reported-posts')}
              className="text-left px-8 py-3 text-gray-800 font-medium hover:bg-white transition-colors"
            >
              โพสต์ที่ถูกรายงาน
            </button>
          </nav>
          
          <div className="p-4 mb-4">
            <button 
              onClick={() => navigate('/')}
              className="w-full bg-[#f94c4c] hover:bg-red-500 text-white font-medium py-2 px-4 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
            >
              ออกจากระบบ
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-[#b0cde2] overflow-y-auto">
          <div className="bg-[#9dbfdb] rounded-xl overflow-hidden max-w-5xl mx-auto border border-white/50 shadow-sm">
            <div className="bg-[#4a85e8] text-white py-4 px-6 text-xl font-medium">
              สรุปรายงานจำนวนครั้งรายงานทั้งหมด
            </div>
            
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-12 text-xl text-gray-700 font-medium">
                  กำลังโหลดข้อมูลรายงาน...
                </div>
              ) : (
                <>
                  {/* การ์ดสีชมพู (โพสต์ที่ถูกรายงานทั้งหมด) */}
                  <div className="flex rounded-xl overflow-hidden shadow-sm h-40 mb-6 border border-gray-300">
                    <div className="w-[45%] bg-[#ff47f4] flex items-center px-8 text-white text-lg font-medium">
                      โพสต์ที่ถูกรายงาน
                    </div>
                    <div className="w-[55%] bg-[#ffb5f5] flex items-center justify-center text-white text-8xl font-light">
                      {totalReportedPosts} 
                    </div>
                  </div>
                  
                  {/* การ์ดสีแดง (โพสต์ที่ถูกรายงาน > 3 ครั้ง) */}
                  <div className="flex rounded-xl overflow-hidden shadow-sm h-40 border border-gray-300">
                    <div className="w-[45%] bg-[#f94c4c] flex items-center px-8 text-white text-lg font-medium">
                      โพสต์ที่ถูกรายงาน {'>'} 3
                    </div>
                    <div className="w-[55%] bg-[#ffa8a8] flex items-center justify-center text-white text-8xl font-light">
                      {severeReportedPosts} 
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
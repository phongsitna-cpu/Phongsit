// src/Reported_post.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

function ReportedPost() {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/reports`);
      setReports(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("ดึงข้อมูลไม่สำเร็จ:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleView = (report) => {
    setSelectedReport(report);
  };

  const handleCancel = async (postId) => {
    if (window.confirm('แน่ใจหรือไม่ที่จะยกเลิกการรายงานโพสต์นี้?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/admin/reports/${postId}/cancel`);
        setReports(prev => prev.filter(r => (r.postId || r.post_id) !== postId));
        alert('ยกเลิกการรายงานเรียบร้อยแล้ว');
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการยกเลิกรายงาน:", error);
        alert('เกิดข้อผิดพลาด ไม่สามารถยกเลิกได้');
      }
    }
  };

  // ลบโพสต์ถาวร + เพิ่ม Strike (เมื่อครบ 3 Strike ระบบหลังบ้านจะทำการลบบัญชีถาวรอัตโนมัติ)
  const handleDeletePost = async (postId) => {
    if (window.confirm('คำเตือน: การลบโพสต์จะเป็นการเพิ่ม 1 Strike ให้เจ้าของโพสต์ทันที ยืนยันหรือไม่?')) {
      try {
        const response = await axios.post(`${API_BASE_URL}/api/admin/posts/${postId}/delete-and-strike`);
        setReports(prev => prev.filter(r => (r.postId || r.post_id) !== postId));
        setSelectedReport(null);
        alert(response.data.message || 'ลบโพสต์และลงโทษผู้ใช้สำเร็จ!');
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการลบโพสต์:", error);
        alert('เกิดข้อผิดพลาด ไม่สามารถลบโพสต์ได้');
      }
    }
  };

  return (
    <div className="h-screen w-full flex flex-col font-sans bg-white relative">
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
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-left px-8 py-3 text-gray-800 font-medium hover:bg-white transition-colors"
            >
              ดูสรุปการรายงาน
            </button>
            <button 
              className="text-left px-8 py-3 text-gray-800 font-medium bg-white transition-colors"
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
        <main className="flex-1 p-8 bg-[#e6f2ff] overflow-y-auto">
          <div className="bg-white rounded-xl overflow-hidden border-2 border-[#4a85e8] max-w-5xl mx-auto h-[600px] flex flex-col">
            <div className="bg-[#4a85e8] text-white py-4 px-6 text-xl font-medium flex justify-between items-center">
              <span>สรุปจำนวนโพสต์ที่ถูกรายงาน</span>
              <button 
                onClick={fetchReports} 
                className="text-sm bg-white text-[#4a85e8] px-3 py-1 rounded font-bold hover:bg-gray-100"
              >
                รีเฟรชข้อมูล
              </button>
            </div>
            
            <div className="p-0 flex-1 overflow-auto">
              {isLoading ? (
                <div className="text-center py-12 text-lg text-gray-600">กำลังโหลดรายการรายงาน...</div>
              ) : reports.length === 0 ? (
                <div className="text-center py-16 text-lg text-gray-500">
                  🎉 ยังไม่มีโพสต์ที่ถูกรายงานในขณะนี้
                </div>
              ) : (
                <table className="w-full text-center border-collapse">
                  <thead className="border-b-2 border-gray-300 bg-white sticky top-0">
                    <tr>
                      <th className="py-3 px-4 font-medium text-gray-700">ลำดับที่</th>
                      <th className="py-3 px-4 font-medium text-gray-700">ไอดีที่ถูกรายงาน</th>
                      <th className="py-3 px-4 font-medium text-gray-700">จำนวนที่ถูกรายงาน</th>
                      <th className="py-3 px-4 font-medium text-gray-700 text-left">เหตุผลหลัก</th>
                      <th className="py-3 px-4 font-medium text-gray-700">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((item, index) => {
                      const pId = item.postId || item.post_id;
                      const count = item.reportCount || item.report_count || 1;
                      const reasonText = item.reason || 'เนื้อหาไม่เหมาะสม';

                      return (
                        <tr key={pId} className="border-b border-gray-300 hover:bg-gray-50">
                          <td className="py-3 px-4 text-lg">{index + 1}</td>
                          <td className="py-3 px-4 text-lg font-mono">{pId}</td>
                          <td className="py-3 px-4 text-lg font-bold text-red-600">{count}</td>
                          <td className="py-3 px-4 text-left">{reasonText}</td>
                          <td className="py-3 px-4 flex justify-center gap-2">
                            {/* ปุ่มดูเนื้อหา */}
                            <button 
                              onClick={() => handleView(item)}
                              className="bg-[#32ff32] hover:bg-green-500 text-black text-sm px-4 py-1 border-[2px] border-black font-medium"
                            >
                              ดูเนื้อหา
                            </button>
                            {/* ปุ่มยกเลิก */}
                            <button 
                              onClick={() => handleCancel(pId)}
                              className="bg-[#e5ff00] hover:bg-yellow-400 text-black text-sm px-4 py-1 border-[2px] border-black font-medium"
                            >
                              ยกเลิก
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modal ดูรายละเอียดเนื้อหา */}
      {selectedReport && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl overflow-hidden border-2 border-black">
            
            <div className="bg-[#4a85e8] text-white px-6 py-3 flex justify-between items-center border-b-2 border-black">
              <h2 className="text-xl font-bold">รายละเอียดการรายงาน (ID: {selectedReport.postId || selectedReport.post_id})</h2>
              <button onClick={() => setSelectedReport(null)} className="text-white hover:text-red-300 font-bold text-xl">X</button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* ข้อมูลเจ้าของโพสต์ + แสดงจำนวน Strike สะสม */}
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-800 font-bold text-lg">
                เจ้าของโพสต์: {selectedReport.details?.ownerName || selectedReport.ownerName || selectedReport.username || 'ผู้ใช้งาน'} 
                {` (สะสม ${selectedReport.details?.strike ?? selectedReport.strike ?? 0}/3 Strike)`}
              </div>

              {/* เนื้อหาโพสต์ */}
              <div className="mb-6 border-b border-gray-300 pb-4">
                <h3 className="font-bold text-gray-700 mb-2">เนื้อหาที่ถูกรายงาน:</h3>
                <p className="mb-3 text-gray-800 bg-gray-100 p-3 rounded">
                  {selectedReport.details?.text || selectedReport.diary_text || 'ไม่มีข้อความ'}
                </p>
                {(selectedReport.details?.image || selectedReport.image_url) && (
                  <img 
                    src={selectedReport.details?.image || selectedReport.image_url} 
                    alt="Reported Content" 
                    className="max-w-full h-auto rounded border border-gray-300 mx-auto max-h-64 object-contain" 
                  />
                )}
              </div>

              {/* ประวัติผู้รายงาน */}
              <div>
                <h3 className="font-bold text-gray-700 mb-2">ประวัติผู้รายงาน (Report Logs):</h3>
                {selectedReport.details?.logs && selectedReport.details.logs.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2">
                    {selectedReport.details.logs.map((log, i) => (
                      <li key={i} className="text-gray-700">
                        <strong>{log.reporter || log.reporter_name || 'ผู้ใช้งาน'}</strong> — เหตุผล: {log.reason} <span className="text-gray-500 text-sm">({log.time || 'เมื่อสักครู่'})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 italic">เหตุผลหลัก: {selectedReport.reason || 'เนื้อหาไม่เหมาะสม'}</p>
                )}
              </div>
            </div>

            {/* ปุ่ม Actions ข้างใน Modal */}
            <div className="bg-gray-100 px-6 py-4 flex justify-end gap-3 border-t-2 border-black">
              <button 
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black font-medium border-2 border-black"
              >
                ปิดหน้าต่าง
              </button>
              {/* ปุ่มลบโพสต์ถาวรอยู่ตรงนี้ */}
              <button 
                onClick={() => handleDeletePost(selectedReport.postId || selectedReport.post_id)}
                className="px-4 py-2 bg-[#f94c4c] hover:bg-red-500 text-white font-medium border-2 border-black"
              >
                ลบโพสต์ถาวร (เพิ่ม 1 Strike)
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default ReportedPost;
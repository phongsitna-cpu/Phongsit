// src/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. นำเข้า useNavigate

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate(); // 2. เรียกใช้งาน

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (email === 'admin' && password === 'admin1234') {
      // 3. เปลี่ยนจาก alert เป็นการเด้งไปหน้า Dashboard
      navigate('/dashboard'); 
    } else {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
  };

  // ... (โค้ดส่วน return ด้านล่างเหมือนเดิมทุกประการ ไม่ต้องแก้ครับ)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="w-full max-w-xs flex flex-col items-center">
        {/* ส่วนของโลโก้ */}
        <div className="mb-4 text-6xl text-blue-400">
           <img 
            src="/LOGO.png" 
            alt="AI Manga Diary Logo" 
            className="w-24 h-auto object-contain" 
          />
        </div>
        <h1 className="text-2xl text-blue-500 font-bold mb-6 text-center shadow-sm p-2 rounded">
          AI Manga Diary Admin
        </h1>

        {/* แสดงกรอบสีแดงเมื่อมีการแจ้งเตือน Error */}
        {error && (
          <div className="mb-4 w-full p-3 bg-red-100 border border-red-400 text-red-700 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full">
          <div className="mb-4">
            <input
              type="text" 
              placeholder="กรอกชื่อผู้ใช้ หรือ อีเมล"
              className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:border-blue-500 font-medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-8">
            <input
              type="password"
              placeholder="กรอกรหัสผ่าน"
              className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:border-blue-500 font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-full border-2 border-black shadow-[0_4px_0_0_rgba(0,0,0,1)] transition-transform active:translate-y-1 active:shadow-none"
          >
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
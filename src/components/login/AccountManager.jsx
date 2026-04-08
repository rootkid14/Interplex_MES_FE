import React, { useState, useEffect } from 'react';
import { Users, Edit, Trash2, Search, X, KeyRound, UserPlus, Save, Loader2 } from 'lucide-react';
import { authApi } from '../../api/authApi';
import Sidebar from '../layout/Sidebar';
import TopSystemBar from '../layout/TopSystemBar';

const AccountManager = () => {
    // State cho Layout
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // State cho danh sách user
    const [users, setUsers] = useState([]);
    const [isFetching, setIsFetching] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // State cho Modal Thêm/Sửa
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        Emp_ID: '',
        Emp_Login: '',
        Emp_Pass: '',
        Emp_Name: '',
        Emp_Role: 'operator',
        Emp_Dept: 'Production'
    });

    // Gọi API lấy dữ liệu lần đầu
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsFetching(true);
        try {
            // Lấy data thực tế từ Backend
            const data = await authApi.getUsers();
            setUsers(data);
        } catch (error) {
            console.error("Lỗi khi tải danh sách tài khoản:", error);
            // Xử lý tạm thời nếu BE chưa có API để tránh sập UI
            alert("Không thể kết nối đến API lấy danh sách tài khoản!");
        } finally {
            setIsFetching(false);
        }
    };

    // Xử lý tìm kiếm (Lọc local)
    const filteredUsers = users.filter(u => 
        (u.Emp_Login || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (u.Emp_Name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(u.Emp_ID).includes(searchTerm)
    );

    const handleOpenModal = (user = null) => {
        if (user) {
            setIsEditing(true);
            setFormData({ ...user, Emp_Pass: '' }); // Cố tình để trống pass, nhập vào là đổi pass mới
        } else {
            setIsEditing(false);
            setFormData({
                Emp_ID: '', Emp_Login: '', Emp_Pass: '', Emp_Name: '', Emp_Role: 'operator', Emp_Dept: 'Production'
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({ Emp_ID: '', Emp_Login: '', Emp_Pass: '', Emp_Name: '', Emp_Role: 'operator', Emp_Dept: 'Production' });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.Emp_ID || !formData.Emp_Login || !formData.Emp_Name) {
            alert("Vui lòng điền đầy đủ các trường bắt buộc!");
            return;
        }
        if (!isEditing && !formData.Emp_Pass) {
            alert("Vui lòng nhập mật khẩu cho tài khoản mới!");
            return;
        }

        setIsLoading(true);
        try {
            // Gọi API tạo hoặc cập nhật
            if (isEditing) {
                await authApi.updateUser(formData.Emp_ID, formData);
                alert("Cập nhật tài khoản thành công!");
            } else {
                await authApi.createUser(formData);
                alert("Tạo tài khoản mới thành công!");
            }
            
            handleCloseModal();
            fetchUsers(); // Tải lại danh sách mới nhất từ server
        } catch (error) {
            const backendMessage = error.response?.data?.detail || error.response?.data?.message || "Lỗi máy chủ";
            alert("Lỗi khi lưu tài khoản: " + backendMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản ${name} (ID: ${id}) không?`)) return;
        
        try {
            // Gọi API Xóa
            await authApi.deleteUser(id);
            alert("Đã xóa tài khoản!");
            fetchUsers(); // Tải lại danh sách mới nhất từ server
        } catch (error) {
            const backendMessage = error.response?.data?.detail || error.response?.data?.message || "Lỗi máy chủ";
            alert("Lỗi khi xóa tài khoản: " + backendMessage);
        }
    };

    return (
        <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden">
            {/* SIDEBAR */}
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            
            {/* MAIN CONTENT WRAPPER */}
            <main className="flex-1 flex flex-col min-w-0 bg-slate-900 relative">
                <TopSystemBar />

                {/* ACCOUNT MANAGER CONTAINER */}
                <div className="flex-1 flex flex-col h-full overflow-hidden animate-fade-in relative z-0">
                    
                    {/* KHU VỰC HEADER CỦA TRANG */}
                    <div className="bg-slate-800 border-b border-slate-700 p-6 shrink-0 shadow-lg">
                        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                                    <Users className="text-blue-400" /> Quản Lý Tài Khoản (Accounts)
                                </h1>
                                <p className="text-slate-400 text-sm mt-1">Tạo, phân quyền và quản lý nhân sự trong hệ thống MES.</p>
                            </div>
                            <button 
                                onClick={() => handleOpenModal()} 
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
                            >
                                <UserPlus size={20} /> THÊM TÀI KHOẢN MỚI
                            </button>
                        </div>
                    </div>

                    {/* KHU VỰC NỘI DUNG (CÓ THANH CUỘN) */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <div className="max-w-7xl mx-auto">
                            {/* TOOLBAR */}
                            <div className="bg-slate-800 p-4 rounded-t-xl border border-slate-700 border-b-0 flex items-center gap-4">
                                <div className="flex-1 relative">
                                    <input 
                                        type="text" 
                                        value={searchTerm} 
                                        onChange={(e) => setSearchTerm(e.target.value)} 
                                        placeholder="Tìm kiếm theo ID, Tên đăng nhập hoặc Họ tên..." 
                                        className="w-full bg-slate-900 border border-slate-600 text-white pl-11 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" 
                                    />
                                    <Search className="absolute left-4 top-3 text-slate-500" size={18} />
                                </div>
                            </div>

                            {/* TABLE */}
                            <div className="bg-slate-800 border border-slate-700 rounded-b-xl overflow-hidden shadow-xl">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead className="bg-slate-900/80 border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                                            <tr>
                                                <th className="p-4 font-semibold">Emp ID</th>
                                                <th className="p-4 font-semibold">Tên Đăng Nhập</th>
                                                <th className="p-4 font-semibold">Họ và Tên</th>
                                                <th className="p-4 font-semibold">Vai trò (Role)</th>
                                                <th className="p-4 font-semibold">Phòng ban (Dept)</th>
                                                <th className="p-4 font-semibold text-right">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm text-slate-300 divide-y divide-slate-700/50">
                                            {isFetching ? (
                                                <tr><td colSpan="6" className="p-8 text-center text-slate-500"><Loader2 className="animate-spin inline-block mr-2" /> Đang tải dữ liệu...</td></tr>
                                            ) : filteredUsers.length === 0 ? (
                                                <tr><td colSpan="6" className="p-8 text-center text-slate-500 italic">Không tìm thấy tài khoản nào.</td></tr>
                                            ) : (
                                                filteredUsers.map((user) => (
                                                    <tr key={user.Emp_ID} className="hover:bg-slate-700/30 transition-colors">
                                                        <td className="p-4 font-mono font-bold text-blue-400">{user.Emp_ID}</td>
                                                        <td className="p-4 font-bold">{user.Emp_Login}</td>
                                                        <td className="p-4">{user.Emp_Name}</td>
                                                        <td className="p-4">
                                                            <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                                                                (user.Emp_Role || '').toLowerCase() === 'admin' 
                                                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            }`}>
                                                                {(user.Emp_Role || '').toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className="bg-slate-900 text-slate-300 px-3 py-1 text-xs rounded border border-slate-600">
                                                                {user.Emp_Dept}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button onClick={() => handleOpenModal(user)} className="p-2 bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white rounded transition-colors" title="Chỉnh sửa">
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button onClick={() => handleDelete(user.Emp_ID, user.Emp_Name)} className="p-2 bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded transition-colors" title="Xóa tài khoản">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MODAL THÊM / SỬA */}
                    {isModalOpen && (
                        <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                            <div className="bg-slate-800 w-full max-w-2xl rounded-2xl border border-slate-600 shadow-2xl flex flex-col overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        {isEditing ? <Edit className="text-blue-400"/> : <UserPlus className="text-emerald-400"/>}
                                        {isEditing ? 'Chỉnh sửa Tài Khoản' : 'Thêm Tài Khoản Mới'}
                                    </h2>
                                    <button onClick={handleCloseModal} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-lg border border-slate-700 hover:bg-slate-700">
                                        <X size={20}/>
                                    </button>
                                </div>
                                
                                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        {/* Emp_ID */}
                                        <div>
                                            <label className="block text-slate-300 font-bold mb-1.5 text-sm">Emp ID <span className="text-red-400">*</span></label>
                                            <input 
                                                type="number" name="Emp_ID" 
                                                value={formData.Emp_ID} onChange={handleInputChange} 
                                                disabled={isEditing} 
                                                className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed font-mono" 
                                                placeholder="VD: 1001" required
                                            />
                                        </div>

                                        {/* Emp_Login */}
                                        <div>
                                            <label className="block text-slate-300 font-bold mb-1.5 text-sm">Tên đăng nhập (Login) <span className="text-red-400">*</span></label>
                                            <input 
                                                type="text" name="Emp_Login" 
                                                value={formData.Emp_Login} onChange={handleInputChange} 
                                                className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                                                placeholder="VD: nguyenvan_a" required
                                            />
                                        </div>

                                        {/* Emp_Name */}
                                        <div className="sm:col-span-2">
                                            <label className="block text-slate-300 font-bold mb-1.5 text-sm">Họ và Tên (Name) <span className="text-red-400">*</span></label>
                                            <input 
                                                type="text" name="Emp_Name" 
                                                value={formData.Emp_Name} onChange={handleInputChange} 
                                                className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                                                placeholder="VD: Nguyễn Văn A" required
                                            />
                                        </div>

                                        {/* Emp_Role */}
                                        <div>
                                            <label className="block text-slate-300 font-bold mb-1.5 text-sm">Vai trò (Role) <span className="text-red-400">*</span></label>
                                            <select 
                                                name="Emp_Role" value={formData.Emp_Role} onChange={handleInputChange} 
                                                className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                            >
                                                <option value="admin">Admin (Quản trị viên)</option>
                                                <option value="operator">Operator (Công nhân/Vận hành)</option>
                                            </select>
                                        </div>

                                        {/* Emp_Dept */}
                                        <div>
                                            <label className="block text-slate-300 font-bold mb-1.5 text-sm">Phòng ban (Dept) <span className="text-red-400">*</span></label>
                                            <select 
                                                name="Emp_Dept" value={formData.Emp_Dept} onChange={handleInputChange} 
                                                className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                            >
                                                <option value="Production">Production (Sản xuất)</option>
                                                <option value="QA">QA (Quản lý chất lượng)</option>
                                                <option value="WH">WH (Kho)</option>
                                                <option value="IT">IT (Công nghệ thông tin)</option>
                                                <option value="Other">Other (Khác)</option>
                                            </select>
                                        </div>

                                        {/* Emp_Pass */}
                                        <div className="sm:col-span-2">
                                            <label className="block text-slate-300 font-bold mb-1.5 text-sm flex items-center gap-2">
                                                <KeyRound size={16} className="text-slate-400" />
                                                Mật khẩu (Password) {isEditing ? <span className="text-slate-500 font-normal text-xs">(Bỏ trống nếu không muốn đổi pass)</span> : <span className="text-red-400">*</span>}
                                            </label>
                                            <input 
                                                type="password" name="Emp_Pass" 
                                                value={formData.Emp_Pass} onChange={handleInputChange} 
                                                className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                                                placeholder="Nhập mật khẩu..." 
                                            />
                                        </div>
                                    </div>

                                    {/* FOOTER */}
                                    <div className="flex gap-3 mt-4 pt-4 border-t border-slate-700">
                                        <button type="button" onClick={handleCloseModal} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-all">
                                            HỦY BỎ
                                        </button>
                                        <button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all">
                                            {isLoading ? <Loader2 size={20} className="animate-spin"/> : <Save size={20}/>}
                                            {isEditing ? 'LƯU THAY ĐỔI' : 'TẠO TÀI KHOẢN'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AccountManager;
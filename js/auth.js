/**
 * Система авторизации INSIDE360
 * Работает с localStorage (без PHP)
 */

class AuthSystem {
 constructor() {
 this.currentUser = null;
 this.storageKey = 'inside360_user';
 this.usersKey = 'inside360_users';
        
 // Также поддерживаем старые ключи для совместимости
 this.legacyUserKey = 'marketing_agency_current_user';
 this.legacyUsersKey = 'marketing_agency_users';
        
 // Инициализация списка пользователей
 this.initUsers();
 }
    
 // Инициализация пользователей
 initUsers() {
 // Проверяем новый формат
 let users = this.getUsersInternal(this.usersKey);
        
 // Если нет, проверяем старый формат
 if (!users || Object.keys(users).length ===0) {
 users = this.getUsersInternal(this.legacyUsersKey);
 if (users && users.length >0) {
 // Конвертируем старый формат в новый
 const newUsers = {};
 users.forEach(u => {
 newUsers[u.username] = {
 password: u.password,
 name: u.name,
 email: u.email,
 phone: u.phone,
 role: u.role
 };
 });
 localStorage.setItem(this.usersKey, JSON.stringify(newUsers));
 }
 }
        
 // Если всё ещё нет, создаём по умолчанию
 if (!users || Object.keys(users).length ===0) {
 const defaultUsers = {
 'admin': { password: 'Admin@2024!', name: 'Администратор', role: 'admin', email: 'admin@inside360.ru' },
 'demo': { password: 'demo123', name: 'Демо пользователь', role: 'user', email: 'demo@example.com' }
 };
 localStorage.setItem(this.usersKey, JSON.stringify(defaultUsers));
 }
 }
    
 // Внутренний метод получения пользователей
 getUsersInternal(key) {
 const data = localStorage.getItem(key);
 if (!data) return null;
 try {
 return JSON.parse(data);
 } catch(e) {
 return null;
 }
 }
    
 // Инициализация - проверка сессии
 async init() {
 await this.checkSession();
 return this.currentUser;
 }
    
 // Получение списка пользователей
 getUsers() {
 return this.getUsersInternal(this.usersKey) || {};
 }
    
 // Сохранение списка пользователей
 saveUsers(users) {
 localStorage.setItem(this.usersKey, JSON.stringify(users));
 // Также сохраняем в старом формате для совместимости
 const legacyUsers = Object.values(users).map(u => ({
 id: Date.now(),
 username: Object.keys(users).find(k => users[k] === u),
 ...u,
 registrationDate: new Date().toISOString()
 }));
 localStorage.setItem(this.legacyUsersKey, JSON.stringify(legacyUsers));
 }
    
 // Регистрация нового пользователя
 async register(username, email, password, name, phone = '') {
 const users = this.getUsers();
        
 // Проверка логина
 if (users[username]) {
 return { success: false, message: 'Пользователь с таким логином уже существует' };
 }
        
 // Проверка email
 for (const key in users) {
 if (users[key].email === email) {
 return { success: false, message: 'Пользователь с таким email уже существует' };
 }
 }
        
 // Валидация
 if (!username || username.length< 3) {
 return { success: false, message: 'Логин должен содержать минимум3 символа' };
 }
 if (!email || !email.includes('@')) {
 return { success: false, message: 'Введите корректный email' };
 }
 if (!password || password.length< 6) {
 return { success: false, message: 'Пароль должен содержать минимум6 символов' };
 }
 if (!name) {
 return { success: false, message: 'Введите ваше имя' };
 }
        
 // Добавление пользователя
 users[username] = {
 password: password,
 name: name,
 email: email,
 phone: phone,
 role: 'user',
 registrationDate: new Date().toISOString()
 };
        
 this.saveUsers(users);
        
 // Автоматический вход после регистрации
 this.currentUser = { 
 username, 
 email, 
 name, 
 phone, 
 role: 'user',
 registrationDate: users[username].registrationDate
 };
 this.saveCurrentUser();
 this.updateUI();
        
 return { success: true, message: 'Регистрация успешна!' };
 }
    
 // Вход пользователя
 async login(username, password) {
 const users = this.getUsers();
 const user = users[username];
        
 if (user && user.password === password) {
 this.currentUser = { 
 username, 
 email: user.email,
 name: user.name, 
 phone: user.phone,
 role: user.role,
 registrationDate: user.registrationDate || new Date().toISOString()
 };
 this.saveCurrentUser();
 this.updateUI();
 return { success: true, message: 'Вход выполнен!' };
 }
        
 return { success: false, message: 'Неверный логин или пароль' };
 }

 // Сохранение текущего пользователя
 saveCurrentUser() {
 localStorage.setItem(this.storageKey, JSON.stringify(this.currentUser));
 // Также сохраняем в старом формате
 localStorage.setItem(this.legacyUserKey, JSON.stringify(this.currentUser));
 }

 // Выход пользователя
 async logout() {
 this.currentUser = null;
 localStorage.removeItem(this.storageKey);
 localStorage.removeItem(this.legacyUserKey);
 this.updateUI();
 return { success: true, message: 'Выход выполнен' };
 }

 // Проверка сессии
 async checkSession() {
 // Пробуем новый ключ
 let stored = localStorage.getItem(this.storageKey);
        
 // Пробуем старый ключ
 if (!stored) {
 stored = localStorage.getItem(this.legacyUserKey);
 }
        
 if (stored) {
 try {
 this.currentUser = JSON.parse(stored);
 this.updateUI();
 return this.currentUser;
 } catch (e) {
 localStorage.removeItem(this.storageKey);
 localStorage.removeItem(this.legacyUserKey);
 }
 }
        
 this.currentUser = null;
 return null;
 }

 // Получение CSRF токена (для совместимости)
 getCsrfFromCookie() {
 return 'local-auth';
 }

 // Получение текущего пользователя
 getCurrentUser() {
 return this.currentUser;
 }

 // Проверка роли
 isAdmin() {
 return this.currentUser?.role === 'admin';
 }

 isManager() {
 return this.currentUser?.role === 'admin' || this.currentUser?.role === 'manager';
 }

 // Обновление UI
 updateUI() {
 const authNav = document.getElementById('authNav');
 if (!authNav) return;

 if (this.currentUser) {
 const isAdmin = this.currentUser.role === 'admin';
            
 if (isAdmin) {
 authNav.innerHTML = `
<li class="nav-item dropdown">
<a href="#" class="nav-link" id="userMenu">
<i class="fas fa-user-shield"></i> ${this.currentUser.name}
</a>
<div class="dropdown-menu">
<a href="admin.html" class="dropdown-item">Админ-панель</a>
<a href="profile.html" class="dropdown-item">Профиль</a>
<div class="dropdown-divider"></div>
<a href="#" id="logoutBtn" class="dropdown-item">Выход</a>
</div>
</li>
 `;
 } else {
 authNav.innerHTML = `
<li class="nav-item dropdown">
<a href="#" class="nav-link" id="userMenu">
<i class="fas fa-user"></i> ${this.currentUser.name}
</a>
<div class="dropdown-menu">
<a href="profile.html" class="dropdown-item">Мои заявки</a>
<a href="new-request.html" class="dropdown-item">Новая заявка</a>
<div class="dropdown-divider"></div>
<a href="#" id="logoutBtn" class="dropdown-item">Выход</a>
</div>
</li>
 `;
 }

 const logoutBtn = document.getElementById('logoutBtn');
 if (logoutBtn) {
 logoutBtn.addEventListener('click', (e) => {
 e.preventDefault();
 this.logout().then(() => {
 window.location.href = 'index.html';
 });
 });
 }

 const userMenu = document.getElementById('userMenu');
 if (userMenu) {
 userMenu.addEventListener('click', (e) => {
 e.preventDefault();
 const dropdown = userMenu.nextElementSibling;
 dropdown.classList.toggle('show');
 });

 document.addEventListener('click', (e) => {
 if (!authNav.contains(e.target)) {
 const dropdowns = document.querySelectorAll('.dropdown-menu');
 dropdowns.forEach(dropdown => {
 dropdown.classList.remove('show');
 });
 }
 });
 }
 } else {
 authNav.innerHTML = '<a href="login.html" class="nav-link" id="loginLink">Вход</a>';
 }
 }

 // Работа с заявками (localStorage)
 async getUserRequests(userId) {
 // Поддержка старого формата
 let requests = JSON.parse(localStorage.getItem('inside360_requests') || '[]');
        
 // Если нет, пробуем старый ключ
 if (requests.length ===0) {
 requests = JSON.parse(localStorage.getItem('marketing_agency_requests') || '[]');
 }
        
 // Если передан userId (старый формат), фильтруем
 if (userId !== undefined && userId !== null) {
 return requests.filter(r => r.userId === userId || r.user_id === userId);
 }
        
 // Иначе возвращаем для текущего пользователя
 if (this.currentUser) {
 return requests.filter(r => r.userId === this.currentUser.id || r.user_id === this.currentUser.username);
 }
        
 return [];
 }

 async createRequest(requestData) {
 if (!this.currentUser) {
 return { success: false, message: 'Требуется авторизация' };
 }
        
 let requests = JSON.parse(localStorage.getItem('inside360_requests') || '[]');
        
 const newRequest = {
 id: Date.now(),
 userId: this.currentUser.id || this.currentUser.username,
 user_id: this.currentUser.username,
 userName: this.currentUser.name,
 name: requestData.name || requestData.title || 'Заявка',
 phone: requestData.phone,
 email: requestData.email || this.currentUser.email,
 service: requestData.service,
 message: requestData.message || requestData.description || '',
 title: requestData.title || '',
 description: requestData.description || '',
 status: 'new',
 priority: 'medium',
 date: new Date().toISOString(),
 created_at: new Date().toISOString()
 };
        
 requests.push(newRequest);
 localStorage.setItem('inside360_requests', JSON.stringify(requests));
        
 // Также сохраняем в старом формате
 const legacyRequests = JSON.parse(localStorage.getItem('marketing_agency_requests') || '[]');
 legacyRequests.push(newRequest);
 localStorage.setItem('marketing_agency_requests', JSON.stringify(legacyRequests));
        
 return { success: true, message: 'Заявка создана!', request: newRequest };
 }
 
 // Получить все заявки (для админа)
 getAllRequests() {
 let requests = JSON.parse(localStorage.getItem('inside360_requests') || '[]');
 if (requests.length ===0) {
 requests = JSON.parse(localStorage.getItem('marketing_agency_requests') || '[]');
 }
 return requests;
 }
 
 // Получить всех пользователей (для админа)
 getAllUsers() {
 const users = this.getUsers();
 return Object.entries(users).map(([username, data]) => ({
 username,
 ...data,
 id: Date.now()
 }));
 }
 
 // Обновить статус заявки
 updateRequestStatus(requestId, newStatus) {
 let requests = JSON.parse(localStorage.getItem('inside360_requests') || '[]');
 if (requests.length ===0) {
 requests = JSON.parse(localStorage.getItem('marketing_agency_requests') || '[]');
 }
        
 const index = requests.findIndex(r => r.id == requestId);
 if (index !== -1) {
 requests[index].status = newStatus;
 localStorage.setItem('inside360_requests', JSON.stringify(requests));
 localStorage.setItem('marketing_agency_requests', JSON.stringify(requests));
 return true;
 }
 return false;
 }
}

// Глобальный экземпляр
const auth = new AuthSystem();

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
 auth.init();
});

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
 module.exports = auth;
} else {
 window.auth = auth;
}

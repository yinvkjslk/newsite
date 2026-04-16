<?php
require_once __DIR__ . '/api/init.php';

// Проверка авторизации
if (!check_auth()) {
    header('Location: login.php');
    exit;
}

$user = get_current_user();

// Администраторы перенаправляются в админ-панель
if ($user['role'] === 'admin') {
    header('Location: admin.php');
    exit;
}

// Получаем данные пользователя из БД
try {
    $db = db();
    $userData = $db->fetchOne(
        "SELECT id, username, email, name, phone, role, created_at, last_login FROM users WHERE id = ?",
        '',
        [$user['id']]
    );
} catch (Exception $e) {
    $userData = $user;
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Мой профиль - INSIDE360</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <nav class="navbar">
        <div class="container">
            <div class="nav-brand">
                <h1>INSIDE360</h1>
            </div>
            <button class="menu-toggle" id="menuToggle">
                <i class="fas fa-bars"></i>
            </button>
            <ul class="nav-menu" id="navMenu">
                <li class="nav-item"><a href="index.php" class="nav-link">Главная</a></li>
                <li class="nav-item"><a href="services.html" class="nav-link">Услуги</a></li>
                <li class="nav-item"><a href="portfolio.html" class="nav-link">Кейсы</a></li>
                <li class="nav-item"><a href="contacts.html" class="nav-link">Контакты</a></li>
                <li class="nav-item" id="authNav"></li>
            </ul>
        </div>
    </nav>

    <div class="container" style="max-width: 800px; margin: 40px auto;">
        <div class="profile-header">
            <h2><i class="fas fa-user-circle"></i> Мой профиль</h2>
            <p>Управление личными данными</p>
        </div>

        <div class="profile-card">
            <div class="profile-info">
                <div class="info-row">
                    <label>Имя:</label>
                    <span id="userName"><?= escape($userData['name'] ?? '') ?></span>
                </div>
                <div class="info-row">
                    <label>Email:</label>
                    <span id="userEmail"><?= escape($userData['email'] ?? '') ?></span>
                </div>
                <div class="info-row">
                    <label>Телефон:</label>
                    <span id="userPhone"><?= escape($userData['phone'] ?? '') ?></span>
                </div>
                <div class="info-row">
                    <label>Роль:</label>
                    <span class="badge badge-info">Пользователь</span>
                </div>
                <div class="info-row">
                    <label>Дата регистрации:</label>
                    <span><?= $userData['created_at'] ? date('d.m.Y', strtotime($userData['created_at'])) : 'Не указана' ?></span>
                </div>
                <div class="info-row">
                    <label>Последний вход:</label>
                    <span><?= $userData['last_login'] ? date('d.m.Y H:i', strtotime($userData['last_login'])) : 'Не входил' ?></span>
                </div>
            </div>

            <div class="profile-actions">
                <button class="btn btn-primary" onclick="editProfile()">
                    <i class="fas fa-edit"></i> Редактировать профиль
                </button>
            </div>
        </div>

        <div class="section-header" style="margin-top: 40px;">
            <h3><i class="fas fa-file-alt"></i> Мои заявки</h3>
        </div>

        <div id="requestsList">
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Загрузка заявок...
            </div>
        </div>

        <div style="margin-top: 40px; text-align: center;">
            <a href="new-request.html" class="btn btn-success">
                <i class="fas fa-plus"></i> Создать новую заявку
            </a>
        </div>
    </div>

    <!-- Модальное окно редактирования профиля -->
    <div class="modal" id="editProfileModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Редактирование профиля</h3>
                <button class="close-btn" onclick="closeEditProfile()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="editProfileForm">
                    <div class="form-group">
                        <label for="editName">Имя *</label>
                        <input type="text" id="editName" name="name" required>
                    </div>
                    <div class="form-group">
                        <label for="editPhone">Телефон</label>
                        <input type="tel" id="editPhone" name="phone" placeholder="+7 (___) ___-__-__">
                    </div>
                    <div class="form-group">
                        <small>Email нельзя изменить. Обратитесь к администратору.</small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeEditProfile()">Отмена</button>
                <button class="btn btn-primary" onclick="saveProfile()">Сохранить</button>
            </div>
        </div>
    </div>

    <script src="js/auth.js"></script>
    <script>
        // Загрузка заявок
        async function loadRequests() {
            const container = document.getElementById('requestsList');
            
            try {
                const result = await fetch('api/auth.php?action=get_user_requests', {
                    method: 'POST',
                    credentials: 'include'
                }).then(r => r.json());
                
                console.log('Requests:', result);
                
                if (result.success && result.requests && result.requests.length > 0) {
                    let html = '<div class="requests-grid">';
                    
                    result.requests.forEach(req => {
                        const statusClass = getStatusClass(req.status);
                        const statusText = getStatusText(req.status);
                        
                        html += `
                            <div class="request-card">
                                <div class="request-header">
                                    <h4>${escapeHtml(req.name)}</h4>
                                    <span class="badge ${statusClass}">${statusText}</span>
                                </div>
                                <div class="request-body">
                                    <p><strong>Услуга:</strong> ${getServiceName(req.service)}</p>
                                    <p>${escapeHtml(req.message || '').substring(0, 100)}...</p>
                                    <small>Создана: ${formatDate(req.created_at)}</small>
                                </div>
                            </div>
                        `;
                    });
                    
                    html += '</div>';
                    container.innerHTML = html;
                } else {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>У вас пока нет заявок</p>
                            <a href="new-request.html" class="btn btn-primary">Создать первую заявку</a>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Error:', error);
                container.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Ошибка загрузки заявок</p>
                    </div>
                `;
            }
        }

        function getStatusClass(status) {
            const classes = {
                'new': 'badge-info',
                'processing': 'badge-warning',
                'completed': 'badge-success',
                'cancelled': 'badge-danger'
            };
            return classes[status] || 'badge-secondary';
        }

        function getStatusText(status) {
            const texts = {
                'new': 'Новая',
                'processing': 'В работе',
                'completed': 'Выполнена',
                'cancelled': 'Отменена'
            };
            return texts[status] || status;
        }

        function getServiceName(service) {
            const services = {
                'smm': 'SMM-продвижение',
                'sites': 'Создание сайтов',
                'context': 'Контекстная реклама',
                'seo': 'SEO-продвижение',
                'marketplace': 'Листинг на маркетплейсах'
            };
            return services[service] || service;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatDate(dateString) {
            if (!dateString) return 'Не указана';
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function editProfile() {
            document.getElementById('editName').value = document.getElementById('userName').textContent;
            document.getElementById('editPhone').value = document.getElementById('userPhone').textContent;
            document.getElementById('editProfileModal').classList.add('active');
        }

        function closeEditProfile() {
            document.getElementById('editProfileModal').classList.remove('active');
        }

        async function saveProfile() {
            const name = document.getElementById('editName').value;
            const phone = document.getElementById('editPhone').value;
            
            const result = await fetch('api/auth.php?action=update_profile', {
                method: 'POST',
                credentials: 'include',
                body: new URLSearchParams({name, phone})
            }).then(r => r.json());
            
            if (result.success) {
                alert('Профиль обновлён!');
                location.reload();
            } else {
                alert(result.message || 'Ошибка сохранения');
            }
        }

        document.addEventListener('DOMContentLoaded', function() {
            loadRequests();
            
            const phoneInput = document.getElementById('editPhone');
            if (phoneInput) {
                phoneInput.addEventListener('input', function(e) {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.startsWith('7') || value.startsWith('8')) value = value.substring(1);
                    let formatted = '+7 (';
                    if (value.length > 0) formatted += value.substring(0, 3);
                    if (value.length > 3) formatted += ') ' + value.substring(3, 6);
                    if (value.length > 6) formatted += '-' + value.substring(6, 8);
                    if (value.length > 8) formatted += '-' + value.substring(8, 10);
                    e.target.value = formatted;
                });
            }
        });
    </script>
</body>
</html>

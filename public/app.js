const API_BASE = 'http://localhost:3000/api';

let token = localStorage.getItem('token');
let currentMonth = new Date();
let habitIconMap = {
    'leaf': '🌿',
    'dumbbell': '💪',
    'book': '📚',
    'heart': '❤️',
    'pencil': '✏️',
    'moon': '🌙',
    'water': '💧',
    'utensils': '🍽️'
};

document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        showDashboard();
        loadHabits();
        renderCalendar();
    } else {
        showAuth();
    }

    // Auth handlers
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        showRegister();
    });
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        showLogin();
    });

    // Dashboard handlers
    document.getElementById('logout').addEventListener('click', () => {
        token = null;
        localStorage.removeItem('token');
        showAuth();
    });

    document.getElementById('addHabitForm').addEventListener('submit', handleAddHabit);
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar();
    });

    // Tab navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(btn.dataset.tab);
        });
    });

    // Contact form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    }

    // FAQ setup
    initializeFAQ();
});

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
            token = data.access_token;
            localStorage.setItem('token', token);
            showDashboard();
            loadHabits();
            renderCalendar();
        } else {
            showMessage(data.message || 'Login failed');
        }
    } catch (err) {
        showMessage('Error logging in');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
            showMessage('Registered successfully. Please login.');
            showLogin();
        } else {
            showMessage(data.message || 'Registration failed');
        }
    } catch (err) {
        showMessage('Error registering');
    }
}

async function handleAddHabit(e) {
    e.preventDefault();
    const name = document.getElementById('habitName').value;
    const description = document.getElementById('habitDescription').value;
    try {
        const res = await fetch(`${API_BASE}/habits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, description })
        });
        if (res.ok) {
            loadHabits();
            document.getElementById('addHabitForm').reset();
        } else {
            showMessage('Failed to add habit');
        }
    } catch (err) {
        showMessage('Error adding habit');
    }
}

function showAuth() {
    document.getElementById('auth').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
    showLogin();
}

function showLogin() {
    document.getElementById('login').style.display = 'block';
    document.getElementById('register').style.display = 'none';
    document.getElementById('loginForm').reset();
}

function showRegister() {
    document.getElementById('login').style.display = 'none';
    document.getElementById('register').style.display = 'block';
    document.getElementById('registerForm').reset();
}

function showDashboard() {
    document.getElementById('auth').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
}

async function loadHabits() {
    try {
        const res = await fetch(`${API_BASE}/habits`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const habits = await res.json();
            displayHabits(habits);
            // If the user is viewing the analytics tab, refresh analytics data after loading habits
            const analyticsTab = document.getElementById('analyticsTab');
            if (analyticsTab && analyticsTab.style.display !== 'none') {
                loadAnalytics();
            }
        } else {
            showMessage('Failed to load habits');
        }
    } catch (err) {
        showMessage('Error loading habits');
    }
}

function displayHabits(habits) {
    const grid = document.getElementById('habitsList');
    const emptyState = document.getElementById('emptyState');
    
    if (!habits || habits.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    grid.innerHTML = '';
    
    habits.forEach(habit => {
        const icon = habitIconMap[habit.icon] || '🎯';
        const isCompleted = habit.completedToday;
        const card = document.createElement('div');
        card.className = `habit-card ${isCompleted ? 'completed' : ''}`;
        
        card.innerHTML = `
            <div class="habit-card-icon">${icon}</div>
            <h4 class="habit-card-name">${habit.name}</h4>
            <p class="habit-card-desc">${habit.description || ''}</p>
            <div class="habit-card-stats">
                <div class="habit-card-stat">
                    <div class="habit-card-stat-value">${habit.currentStreak}</div>
                    <div class="habit-card-stat-label">Current</div>
                </div>
                <div class="habit-card-stat">
                    <div class="habit-card-stat-value">${habit.longestStreak}</div>
                    <div class="habit-card-stat-label">Longest</div>
                </div>
            </div>
            <div class="habit-card-actions">
                <button class="mark-btn" onclick="completeHabit(${habit.id})" ${isCompleted ? 'disabled' : ''}>
                    ${isCompleted ? '✓ Done' : 'Mark Done'}
                </button>
                <button class="edit-btn" onclick="editHabit(${habit.id})">Edit</button>
                <button class="delete-btn" onclick="deleteHabit(${habit.id})">Delete</button>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

async function completeHabit(id) {
    try {
        const res = await fetch(`${API_BASE}/habits/${id}/complete`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            await loadHabits();
            // Refresh analytics immediately when a habit is marked done
            loadAnalytics();
        } else {
            showMessage('Failed to mark as done');
        }
    } catch (err) {
        showMessage('Error marking habit');
    }
}

async function editHabit(id) {
    const newName = prompt('New name:');
    if (!newName) return;
    const newDesc = prompt('New description:');
    
    try {
        const res = await fetch(`${API_BASE}/habits/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: newName, description: newDesc })
        });
        if (res.ok) {
            loadHabits();
        } else {
            showMessage('Failed to edit habit');
        }
    } catch (err) {
        showMessage('Error editing habit');
    }
}

async function deleteHabit(id) {
    if (confirm('Delete this habit?')) {
        try {
            const res = await fetch(`${API_BASE}/habits/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                loadHabits();
            } else {
                showMessage('Failed to delete habit');
            }
        } catch (err) {
            showMessage('Error deleting habit');
        }
    }
}

function showMessage(text) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
}

function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const currentMonthEl = document.getElementById('currentMonth');
    
    const month = currentMonth.getMonth();
    const year = currentMonth.getFullYear();
    const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    currentMonthEl.textContent = monthName;
    calendar.innerHTML = '';
    
    // Day names
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.className = 'day-name';
        dayEl.textContent = day;
        calendar.appendChild(dayEl);
    });
    
    // First day of month
    const firstDay = new Date(year, month, 1).getDay();
    
    // Days from previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
        const dayEl = document.createElement('div');
        dayEl.className = 'day other-month';
        dayEl.textContent = prevMonthDays - i;
        calendar.appendChild(dayEl);
    }
    
    // Days of current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'day';
        dayEl.textContent = day;
        
        const date = new Date(year, month, day);
        if (date.toDateString() === today.toDateString()) {
            dayEl.classList.add('selected');
        }
        
        calendar.appendChild(dayEl);
    }
    
    // Days from next month
    const totalCells = calendar.children.length - 7; // subtract day names
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    for (let i = 1; i <= remainingCells; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'day other-month';
        dayEl.textContent = i;
        calendar.appendChild(dayEl);
    }
}

/* ===== TAB SWITCHING ===== */
function switchTab(tabName) {
    // Hide all sections
    document.getElementById('habitsTab').style.display = 'none';
    document.getElementById('analyticsTab').style.display = 'none';
    document.getElementById('helpTab').style.display = 'none';
    
    // Remove active class from all buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected section
    if (tabName === 'habits') {
        document.getElementById('habitsTab').style.display = 'block';
        document.getElementById('navHabits').classList.add('active');
    } else if (tabName === 'analytics') {
        document.getElementById('analyticsTab').style.display = 'block';
        document.getElementById('navAnalytics').classList.add('active');
        loadAnalytics();
    } else if (tabName === 'help') {
        document.getElementById('helpTab').style.display = 'block';
        document.getElementById('navHelp').classList.add('active');
    }
}

/* ===== ANALYTICS ===== */
async function loadAnalytics() {
    try {
        const res = await fetch(`${API_BASE}/habits`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const habits = await res.json();
            displayAnalytics(habits);
        }
    } catch (err) {
        showMessage('Error loading analytics');
    }
}

function displayAnalytics(habits) {
    // Total habits
    document.getElementById('totalHabits').textContent = habits.length;
    
    // Today's completion
    const todayCompleted = habits.filter(h => h.completedToday).length;
    const todayPercent = habits.length > 0 ? Math.round((todayCompleted / habits.length) * 100) : 0;
    document.getElementById('todayCompletion').textContent = todayPercent + '%';
    
    // This week completion (simplified - assuming last 7 days)
    const weekTotal = habits.reduce((sum, h) => sum + (h.completedDates ? h.completedDates.length : 0), 0);
    const weekPercent = habits.length > 0 ? Math.round((weekTotal / (habits.length * 7)) * 100) : 0;
    document.getElementById('weekCompletion').textContent = weekPercent + '%';
    
    // Best streak
    const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.longestStreak)) : 0;
    document.getElementById('bestStreak').textContent = bestStreak;
    
    // Top habits
    const topHabits = [...habits]
        .sort((a, b) => b.currentStreak - a.currentStreak);
    
    const bestList = document.getElementById('bestHabitsList');
    bestList.innerHTML = '';
    topHabits.forEach(habit => {
        const icon = habitIconMap[habit.icon] || '🎯';
        const item = document.createElement('div');
        item.className = 'best-habit-item';
        item.innerHTML = `
            <span class="best-habit-name">${icon} ${habit.name}</span>
            <span class="best-habit-streak">🔥 ${habit.currentStreak}</span>
        `;
        bestList.appendChild(item);
    });
    
    // Weekly chart
    displayWeeklyChart(habits);
}

function displayWeeklyChart(habits) {
    const chartContainer = document.getElementById('weeklyChart');
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    
    let dailyCompletion = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        let count = 0;
        habits.forEach(habit => {
            if (habit.completedDates && habit.completedDates.includes(dateStr)) {
                count++;
            }
        });
        
        dailyCompletion.push({
            label: dayLabels[date.getDay()],
            count: count,
            max: habits.length
        });
    }
    
    const chart = chartContainer.querySelector('.chart-container');
    if (chart) {
        chart.innerHTML = '';
        dailyCompletion.forEach((day, idx) => {
            const percentage = day.max > 0 ? (day.count / day.max) * 100 : 0;
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.height = Math.max(5, percentage) + '%';
            bar.setAttribute('title', `${day.label}: ${day.count}/${day.max} habits`);
            
            const label = document.createElement('div');
            label.className = 'chart-day-label';
            label.textContent = day.label;
            bar.appendChild(label);
            
            chart.appendChild(bar);
        });
    }
}

/* ===== FAQ ===== */
const faqData = [
    {
        q: 'How do I create a new habit?',
        a: 'Click on the "Add Habit" section on the left side of your dashboard. Enter a habit name, optional description, and select an icon. Then click "Add Habit" to create it.'
    },
    {
        q: 'How are streaks calculated?',
        a: 'A streak is the number of consecutive days you complete a habit. The streak resets if you miss a day. Your longest streak is the best consecutive days you\'ve achieved.'
    },
    {
        q: 'What does "completedToday" mean?',
        a: 'This indicates whether you\'ve marked the habit as completed for the current day. You can only mark it done once per day. Click "Mark Done" to complete today\'s habit.'
    },
    {
        q: 'How do I view my analytics?',
        a: 'Click the "Analytics" tab at the top of the dashboard. You\'ll see your daily completion percentage, weekly overview, best performing habits, and overall statistics.'
    },
    {
        q: 'Can I edit or delete a habit?',
        a: 'Yes! Click the "Edit" button to modify a habit\'s name or description. Click "Delete" to remove it entirely. Be careful as deletion cannot be undone.'
    },
    {
        q: 'How do I contact support?',
        a: 'Go to the "Help" tab and scroll down to the contact form. Fill in your email, subject, and message, then click "Send Message". We\'ll respond as soon as possible.'
    }
];

function initializeFAQ() {
    const faqList = document.getElementById('faqList');
    if (!faqList) return;
    
    faqList.innerHTML = '';
    faqData.forEach((item, idx) => {
        const faqItem = document.createElement('div');
        faqItem.className = 'faq-item';
        faqItem.innerHTML = `
            <div class="faq-question">
                <span>${item.q}</span>
                <i class="fas fa-chevron-down faq-toggle"></i>
            </div>
            <div class="faq-answer">
                <p>${item.a}</p>
            </div>
        `;
        
        faqItem.querySelector('.faq-question').addEventListener('click', () => {
            faqItem.classList.toggle('active');
        });
        
        faqList.appendChild(faqItem);
    });
}

/* ===== CONTACT FORM ===== */
async function handleContactForm(e) {
    e.preventDefault();
    
    const email = document.getElementById('contactEmail').value;
    const subject = document.getElementById('contactSubject').value;
    const message = document.getElementById('contactMessage').value;
    
    // Simple validation
    if (!email || !subject || !message) {
        showMessage('Please fill in all fields');
        return;
    }
    
    // Simulate sending (in production, you'd send to backend)
    showMessage('✓ Message sent! We\'ll contact you soon at ' + email);
    document.getElementById('contactForm').reset();
}

// Hide analytics tab initially
document.addEventListener('DOMContentLoaded', () => {
    const habitsTab = document.getElementById('habitsTab');
    if (!habitsTab) {
        // Create wrapper for habits section
        const habitsSection = document.querySelector('.habits-section');
        if (habitsSection) {
            const wrapper = document.createElement('div');
            wrapper.id = 'habitsTab';
            habitsSection.parentNode.insertBefore(wrapper, habitsSection);
            wrapper.appendChild(habitsSection.parentNode.querySelector('.entry-section'));
            wrapper.appendChild(habitsSection);
        }
    }
}, { once: true });

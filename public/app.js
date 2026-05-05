const API_BASE = 'http://localhost:3000/api';
const TIMER_STORAGE_KEY = 'habitTimerState';

let token = localStorage.getItem('token');
let currentMonth = new Date();
let currentHabits = [];
let timerTickHandle = null;

const habitIconMap = {
    leaf: '\u{1F33F}',
    dumbbell: '\u{1F4AA}',
    book: '\u{1F4DA}',
    heart: '\u{2764}\u{FE0F}',
    pencil: '\u{270F}\u{FE0F}',
    moon: '\u{1F319}',
    water: '\u{1F4A7}',
    utensils: '\u{1F37D}\u{FE0F}'
};

let timerState = loadTimerState();

document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        showDashboard();
        loadHabits();
        renderCalendar();
        ensureTimerTicker();
    } else {
        showAuth();
    }

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

    document.getElementById('logout').addEventListener('click', () => {
        token = null;
        localStorage.removeItem('token');
        currentHabits = [];
        timerState = {};
        saveTimerState();
        stopTimerTicker();
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

    document.querySelectorAll('.nav-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    }

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
            await loadHabits();
            renderCalendar();
            ensureTimerTicker();
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
    const name = document.getElementById('habitName').value.trim();
    const description = document.getElementById('habitDescription').value.trim();
    const icon = document.getElementById('habitIcon').value;
    const timerMinutes = Number(document.getElementById('habitTimerMinutes').value || 0);

    try {
        const res = await fetch(`${API_BASE}/habits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, description, icon, timerMinutes })
        });

        if (res.ok) {
            await loadHabits();
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
            currentHabits = await res.json();
            pruneTimerState(currentHabits);
            displayHabits(currentHabits);

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

    habits.forEach((habit) => {
        const icon = habitIconMap[habit.icon] || '\u{1F3AF}';
        const isCompleted = habit.completedToday;
        const timerInfo = getTimerPresentation(habit);
        const card = document.createElement('div');
        card.className = `habit-card ${isCompleted ? 'completed' : ''}`;

        card.innerHTML = `
            <div class="habit-card-icon">${icon}</div>
            <h4 class="habit-card-name">${habit.name}</h4>
            <p class="habit-card-desc">${habit.description || 'No description yet.'}</p>
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
            <div class="habit-timer-panel">
                <div class="habit-timer-meta">
                    <span class="habit-timer-duration">Timer: ${formatDurationLabel(habit.timerMinutes)}</span>
                    <span class="habit-timer-state ${timerInfo.stateClass}" id="timer-status-${habit.id}">${timerInfo.statusText}</span>
                </div>
                <div class="habit-timer-countdown" id="timer-countdown-${habit.id}">${timerInfo.countdownText}</div>
            </div>
            <div class="habit-card-actions">
                <button class="timer-btn" onclick="toggleHabitTimer(${habit.id})" ${timerInfo.timerButtonDisabled ? 'disabled' : ''}>
                    ${timerInfo.timerButtonText}
                </button>
                <button class="mark-btn" onclick="completeHabit(${habit.id})" ${timerInfo.markButtonDisabled ? 'disabled' : ''}>
                    ${timerInfo.markButtonText}
                </button>
                <button class="edit-btn" onclick="editHabit(${habit.id})">Edit</button>
                <button class="delete-btn" onclick="deleteHabit(${habit.id})">Delete</button>
            </div>
        `;

        grid.appendChild(card);
    });
}

function getTimerPresentation(habit) {
    const timerMinutes = Number(habit.timerMinutes || 0);
    const state = timerState[String(habit.id)];

    if (habit.completedToday) {
        return {
            statusText: 'Completed today',
            countdownText: timerMinutes > 0 ? 'You can start again tomorrow.' : 'Habit already completed for today.',
            timerButtonText: timerMinutes > 0 ? 'Restart Tomorrow' : 'No Timer',
            timerButtonDisabled: true,
            markButtonText: 'Done',
            markButtonDisabled: true,
            stateClass: 'is-complete'
        };
    }

    if (timerMinutes <= 0) {
        return {
            statusText: 'Timer optional',
            countdownText: 'No countdown set for this habit.',
            timerButtonText: 'No Timer',
            timerButtonDisabled: true,
            markButtonText: 'Mark Done',
            markButtonDisabled: false,
            stateClass: 'is-idle'
        };
    }

    if (state && state.status === 'running') {
        return {
            statusText: 'Focus session running',
            countdownText: formatCountdown(Math.max(0, state.endTime - Date.now())),
            timerButtonText: 'Cancel Timer',
            timerButtonDisabled: false,
            markButtonText: 'Timer Running',
            markButtonDisabled: true,
            stateClass: 'is-running'
        };
    }

    if (state && state.status === 'finished') {
        return {
            statusText: 'Timer finished',
            countdownText: 'Great work. You can mark this habit done now.',
            timerButtonText: 'Start Again',
            timerButtonDisabled: false,
            markButtonText: 'Mark Done',
            markButtonDisabled: false,
            stateClass: 'is-finished'
        };
    }

    return {
        statusText: 'Ready to start',
        countdownText: `Start a ${formatDurationLabel(timerMinutes)} focus session for this habit.`,
        timerButtonText: 'Start Timer',
        timerButtonDisabled: false,
        markButtonText: 'Complete After Timer',
        markButtonDisabled: true,
        stateClass: 'is-idle'
    };
}

async function completeHabit(id) {
    try {
        const res = await fetch(`${API_BASE}/habits/${id}/complete`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            clearHabitTimerState(id);
            await loadHabits();
            loadAnalytics();
        } else {
            showMessage('Failed to mark as done');
        }
    } catch (err) {
        showMessage('Error marking habit');
    }
}

async function editHabit(id) {
    const habit = currentHabits.find((item) => item.id === id);
    if (!habit) {
        showMessage('Habit not found');
        return;
    }

    const newName = prompt('New name:', habit.name);
    if (!newName) return;

    const newDesc = prompt('New description:', habit.description || '') ?? habit.description ?? '';
    const timerInput = prompt('Timer duration in minutes (0 to remove timer):', String(habit.timerMinutes || 0));
    if (timerInput === null) return;

    const timerMinutes = Number(timerInput);
    if (Number.isNaN(timerMinutes) || timerMinutes < 0) {
        showMessage('Please enter a valid timer in minutes');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/habits/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: newName.trim(),
                description: newDesc.trim(),
                icon: habit.icon,
                timerMinutes
            })
        });

        if (res.ok) {
            if (timerMinutes <= 0) {
                clearHabitTimerState(id);
            }
            await loadHabits();
        } else {
            showMessage('Failed to edit habit');
        }
    } catch (err) {
        showMessage('Error editing habit');
    }
}

async function deleteHabit(id) {
    if (!confirm('Delete this habit?')) return;

    try {
        const res = await fetch(`${API_BASE}/habits/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            clearHabitTimerState(id);
            await loadHabits();
        } else {
            showMessage('Failed to delete habit');
        }
    } catch (err) {
        showMessage('Error deleting habit');
    }
}

function toggleHabitTimer(id) {
    const habit = currentHabits.find((item) => item.id === id);
    if (!habit || habit.completedToday || !habit.timerMinutes) {
        return;
    }

    const state = timerState[String(id)];
    if (state && state.status === 'running') {
        clearHabitTimerState(id);
        displayHabits(currentHabits);
        showMessage(`Timer canceled for ${habit.name}`);
        return;
    }

    startHabitTimer(habit);
}

async function startHabitTimer(habit) {
    await requestNotificationPermission();

    timerState[String(habit.id)] = {
        status: 'running',
        endTime: Date.now() + Number(habit.timerMinutes) * 60000,
        durationMinutes: Number(habit.timerMinutes),
        habitName: habit.name
    };

    saveTimerState();
    ensureTimerTicker();
    displayHabits(currentHabits);
    showMessage(`Timer started for ${habit.name}`);
}

function showMessage(text) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.style.display = 'block';
    setTimeout(() => {
        msg.style.display = 'none';
    }, 3000);
}

function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const currentMonthEl = document.getElementById('currentMonth');

    const month = currentMonth.getMonth();
    const year = currentMonth.getFullYear();
    const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    currentMonthEl.textContent = monthName;
    calendar.innerHTML = '';

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach((day) => {
        const dayEl = document.createElement('div');
        dayEl.className = 'day-name';
        dayEl.textContent = day;
        calendar.appendChild(dayEl);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const prevMonthDays = new Date(year, month, 0).getDate();

    for (let i = firstDay - 1; i >= 0; i--) {
        const dayEl = document.createElement('div');
        dayEl.className = 'day other-month';
        dayEl.textContent = prevMonthDays - i;
        calendar.appendChild(dayEl);
    }

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

    const totalCells = calendar.children.length - 7;
    const remainingCells = 42 - totalCells;

    for (let i = 1; i <= remainingCells; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'day other-month';
        dayEl.textContent = i;
        calendar.appendChild(dayEl);
    }
}

function switchTab(tabName) {
    document.getElementById('habitsTab').style.display = 'none';
    document.getElementById('analyticsTab').style.display = 'none';
    document.getElementById('helpTab').style.display = 'none';

    document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.remove('active'));

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
    document.getElementById('totalHabits').textContent = habits.length;

    const todayCompleted = habits.filter((habit) => habit.completedToday).length;
    const todayPercent = habits.length > 0 ? Math.round((todayCompleted / habits.length) * 100) : 0;
    document.getElementById('todayCompletion').textContent = `${todayPercent}%`;

    const weekTotal = habits.reduce((sum, habit) => sum + (habit.completedDates ? habit.completedDates.length : 0), 0);
    const weekPercent = habits.length > 0 ? Math.round((weekTotal / (habits.length * 7)) * 100) : 0;
    document.getElementById('weekCompletion').textContent = `${weekPercent}%`;

    const bestStreak = habits.length > 0 ? Math.max(...habits.map((habit) => habit.longestStreak)) : 0;
    document.getElementById('bestStreak').textContent = bestStreak;

    const topHabits = [...habits].sort((a, b) => b.currentStreak - a.currentStreak);
    const bestList = document.getElementById('bestHabitsList');
    bestList.innerHTML = '';

    topHabits.forEach((habit) => {
        const icon = habitIconMap[habit.icon] || '\u{1F3AF}';
        const item = document.createElement('div');
        item.className = 'best-habit-item';
        item.innerHTML = `
            <span class="best-habit-name">${icon} ${habit.name}</span>
            <span class="best-habit-streak">\u{1F525} ${habit.currentStreak}</span>
        `;
        bestList.appendChild(item);
    });

    displayWeeklyChart(habits);
}

function displayWeeklyChart(habits) {
    const chartContainer = document.getElementById('weeklyChart');
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 6);

    const dailyCompletion = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        let count = 0;
        habits.forEach((habit) => {
            if (habit.completedDates && habit.completedDates.includes(dateStr)) {
                count++;
            }
        });

        dailyCompletion.push({
            label: dayLabels[date.getDay()],
            count,
            max: habits.length
        });
    }

    chartContainer.innerHTML = '';
    dailyCompletion.forEach((day) => {
        const percentage = day.max > 0 ? (day.count / day.max) * 100 : 0;
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${Math.max(5, percentage)}%`;
        bar.setAttribute('title', `${day.label}: ${day.count}/${day.max} habits`);

        const label = document.createElement('div');
        label.className = 'chart-day-label';
        label.textContent = day.label;
        bar.appendChild(label);

        chartContainer.appendChild(bar);
    });
}

const faqData = [
    {
        q: 'How do I create a new habit?',
        a: 'Use the Add Habit form on the left side of your dashboard. You can enter a name, an optional description, choose an icon, and even set a focus timer in minutes.'
    },
    {
        q: 'How are streaks calculated?',
        a: 'A streak is the number of consecutive days you complete a habit. The streak resets if you miss a day. Your longest streak is the best consecutive days you have achieved.'
    },
    {
        q: 'How does the timer feature work?',
        a: 'Set a timer when creating or editing a habit, then press Start Timer on the habit card. When the countdown ends, a reminder appears and you can press Mark Done to complete the habit for today.'
    },
    {
        q: 'How do I view my analytics?',
        a: 'Click the Analytics tab at the top of the dashboard. You will see your daily completion percentage, weekly overview, best performing habits, and overall statistics.'
    },
    {
        q: 'Can I edit or delete a habit?',
        a: 'Yes. Click Edit to update a habit name, description, or timer. Click Delete to remove it entirely.'
    },
    {
        q: 'How do I contact support?',
        a: 'Go to the Help tab and scroll down to the contact form. Fill in your email, subject, and message, then click Send Message.'
    }
];

function initializeFAQ() {
    const faqList = document.getElementById('faqList');
    if (!faqList) return;

    faqList.innerHTML = '';
    faqData.forEach((item) => {
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

async function handleContactForm(e) {
    e.preventDefault();

    const email = document.getElementById('contactEmail').value;
    const subject = document.getElementById('contactSubject').value;
    const message = document.getElementById('contactMessage').value;

    if (!email || !subject || !message) {
        showMessage('Please fill in all fields');
        return;
    }

    showMessage(`Message sent. We will contact you soon at ${email}`);
    document.getElementById('contactForm').reset();
}

function loadTimerState() {
    try {
        const saved = localStorage.getItem(TIMER_STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (err) {
        return {};
    }
}

function saveTimerState() {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerState));
}

function pruneTimerState(habits) {
    const validIds = new Set(habits.map((habit) => String(habit.id)));
    Object.keys(timerState).forEach((id) => {
        if (!validIds.has(id)) {
            delete timerState[id];
        }
    });
    saveTimerState();
}

function clearHabitTimerState(id) {
    delete timerState[String(id)];
    saveTimerState();
}

function ensureTimerTicker() {
    if (timerTickHandle) return;

    timerTickHandle = setInterval(() => {
        updateTimerStates();
        refreshTimerDisplay();
    }, 1000);
}

function stopTimerTicker() {
    if (!timerTickHandle) return;
    clearInterval(timerTickHandle);
    timerTickHandle = null;
}

function updateTimerStates() {
    let changed = false;

    Object.entries(timerState).forEach(([id, state]) => {
        if (state.status === 'running' && state.endTime <= Date.now()) {
            state.status = 'finished';
            changed = true;

            const habit = currentHabits.find((item) => String(item.id) === id);
            const habitName = habit ? habit.name : state.habitName || 'Habit';
            showTimerFinishedNotification(habitName);
        }
    });

    if (changed) {
        saveTimerState();
    }
}

function refreshTimerDisplay() {
    currentHabits.forEach((habit) => {
        const timerInfo = getTimerPresentation(habit);
        const statusEl = document.getElementById(`timer-status-${habit.id}`);
        const countdownEl = document.getElementById(`timer-countdown-${habit.id}`);

        if (statusEl) {
            statusEl.className = `habit-timer-state ${timerInfo.stateClass}`;
            statusEl.textContent = timerInfo.statusText;
        }

        if (countdownEl) {
            countdownEl.textContent = timerInfo.countdownText;
        }
    });
}

async function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    try {
        await Notification.requestPermission();
    } catch (err) {
        // Ignore browser notification permission errors and fall back to in-app messaging.
    }
}

function showTimerFinishedNotification(habitName) {
    const body = `Time is up for ${habitName}. Mark it done when you are ready for your next habit.`;

    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Timer finished`, { body });
    }

    showMessage(body);
    displayHabits(currentHabits);
}

function formatDurationLabel(minutes) {
    const totalMinutes = Number(minutes || 0);
    if (totalMinutes <= 0) return 'Off';

    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const parts = [];

    if (hours > 0) parts.push(`${hours}h`);
    if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);

    return parts.join(' ') || '0m';
}

function formatCountdown(milliseconds) {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
        .map((value) => String(value).padStart(2, '0'))
        .join(':');
}

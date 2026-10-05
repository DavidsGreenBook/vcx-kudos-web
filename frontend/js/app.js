/**
 * VIETTEL CX - PEER RECOGNITION APPLICATION
 * Core Client-side Logic (Vanilla JavaScript & Fetch API)
 * New Viettel Brand Identity & Digital Touchpoints Optimization
 */

const API_BASE = '/api';

// Application State
const state = {
  currentUser: null,
  allUsers: [],
  selectedPoints: 20,
  selectedBadge: 'Tận tâm',
  leaderboardType: 'weekly',
  feedFilter: 'all',
  feedBadgeFilter: 'all',
  isSubmitting: false,
  likedTransactions: new Set()
};

// DOM Elements cache
const elements = {
  currentUserName: document.getElementById('current-user-name'),
  currentUserRole: document.getElementById('current-user-role'),
  currentUserAvatar: document.getElementById('current-user-avatar'),
  givingBalanceVal: document.getElementById('giving-balance-val'),
  balanceReminderVal: document.getElementById('balance-reminder-val'),
  balanceReminderTag: document.getElementById('balance-reminder-tag'),
  receiverSelect: document.getElementById('receiver-select'),
  pointsInput: document.getElementById('points-input'),
  messageInput: document.getElementById('message-input'),
  charCounter: document.getElementById('char-counter'),
  transferBtn: document.getElementById('btn-submit-transfer'),
  feedList: document.getElementById('feed-list'),
  podiumContainer: document.getElementById('podium-container'),
  leaderboardList: document.getElementById('leaderboard-list'),
  userSwitchModal: document.getElementById('user-switch-modal'),
  userSwitchList: document.getElementById('user-switch-list'),
  statTotalRecognitions: document.getElementById('stat-total-recognitions'),
  statTotalPoints: document.getElementById('stat-total-points'),
  statActiveEmployees: document.getElementById('stat-active-employees'),
  statWeekPoints: document.getElementById('stat-week-points'),
  countdownTimer: document.getElementById('countdown-timer'),

  // Live Card Preview Elements
  previewSenderName: document.getElementById('preview-sender-name'),
  previewReceiverName: document.getElementById('preview-receiver-name'),
  previewBadgeDisplay: document.getElementById('preview-badge-display'),
  previewPointsDisplay: document.getElementById('preview-points-display'),
  previewMessageDisplay: document.getElementById('preview-message-display')
};

// ----------------- Initialization ----------------- //

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  initCountdownTimer();
  updateLivePreview();
  await loadInitialData();
});

async function loadInitialData() {
  try {
    await loadUsers();
    
    // Determine active user from LocalStorage or default to first user
    const savedUserId = localStorage.getItem('viettel_cx_user_id');
    const defaultUser = state.allUsers.find(u => u.id === parseInt(savedUserId)) || state.allUsers[0];
    if (defaultUser) {
      setCurrentUser(defaultUser);
    }

    await Promise.all([
      loadFeed(),
      loadLeaderboard(state.leaderboardType),
      loadStats()
    ]);
  } catch (err) {
    console.error('Initialization error:', err);
    showToast('Lỗi kết nối', 'Không thể kết nối với máy chủ API. Vui lòng kiểm tra lại.', 'error');
  }
}

// ----------------- Event Listeners ----------------- //

function setupEventListeners() {
  // Point chips click
  document.querySelectorAll('.point-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.point-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const pts = parseInt(chip.getAttribute('data-points'));
      elements.pointsInput.value = pts;
      state.selectedPoints = pts;
      updateLivePreview();
    });
  });

  // Custom point input
  elements.pointsInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value) || 0;
    state.selectedPoints = val;
    document.querySelectorAll('.point-chip').forEach(c => {
      c.classList.toggle('active', parseInt(c.getAttribute('data-points')) === val);
    });
    updateLivePreview();
  });

  // Badge selections in form
  document.querySelectorAll('.badge-choice').forEach(choice => {
    choice.addEventListener('click', () => {
      document.querySelectorAll('.badge-choice').forEach(b => b.classList.remove('active'));
      choice.classList.add('active');
      state.selectedBadge = choice.getAttribute('data-badge');
      updateLivePreview();
    });
  });

  // Receiver select change
  elements.receiverSelect.addEventListener('change', () => {
    updateLivePreview();
  });

  // Message input & char count
  elements.messageInput.addEventListener('input', (e) => {
    const len = e.target.value.length;
    elements.charCounter.textContent = `${len}/300`;
    updateLivePreview();
  });

  // Quick prompt chips
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.getAttribute('data-text');
      elements.messageInput.value = text;
      elements.charCounter.textContent = `${text.length}/300`;
      elements.messageInput.focus();
      updateLivePreview();
      showToast('Đã chọn mẫu lời chúc', 'Bạn có thể chỉnh sửa thêm nội dung theo ý muốn.', 'info');
    });
  });

  // 5 Core Service Cards click (Auto-select badge & scroll to form)
  document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('click', () => {
      const badge = card.getAttribute('data-service-badge');
      if (badge) {
        state.selectedBadge = badge;
        document.querySelectorAll('.badge-choice').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-badge') === badge);
        });
        updateLivePreview();

        // Close values modal if open
        const valuesModal = document.getElementById('core-values-modal');
        if (valuesModal) valuesModal.classList.remove('active');

        // Scroll to form smoothly
        const formCard = document.getElementById('section-transfer');
        if (formCard) {
          formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          formCard.style.transition = 'box-shadow 0.3s ease';
          formCard.style.boxShadow = '0 0 0 3px #EE0033, 0 10px 30px rgba(238, 0, 51, 0.2)';
          setTimeout(() => {
            formCard.style.boxShadow = '';
          }, 1500);
        }
        showToast(`Đã chọn giá trị: ${badge}`, 'Hãy chọn đồng nghiệp và nhập lời tri ân để gửi vinh danh ngay!', 'info');
      }
    });
  });

  // Form submit (Tặng điểm)
  document.getElementById('transfer-form').addEventListener('submit', handleTransferSubmit);

  // Leaderboard timeframe toggle
  document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.leaderboardType = btn.getAttribute('data-type');
      loadLeaderboard(state.leaderboardType);
    });
  });

  // Feed filter tabs (Tất cả / Của tôi)
  document.querySelectorAll('.feed-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.feedFilter = tab.getAttribute('data-filter');
      loadFeed();
    });
  });

  // Feed core value badge filter pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.feedBadgeFilter = pill.getAttribute('data-badge');
      loadFeed();
    });
  });

  // User Switcher Modal toggles
  document.getElementById('btn-open-user-switch').addEventListener('click', openUserSwitchModal);
  document.getElementById('btn-close-modal').addEventListener('click', closeUserSwitchModal);
  elements.userSwitchModal.addEventListener('click', (e) => {
    if (e.target === elements.userSwitchModal) closeUserSwitchModal();
  });

  // Core Values Modal backdrop click
  const valuesModal = document.getElementById('core-values-modal');
  if (valuesModal) {
    valuesModal.addEventListener('click', (e) => {
      if (e.target === valuesModal) valuesModal.classList.remove('active');
    });
  }

  // Admin / Demo Reset Actions
  document.getElementById('btn-admin-reset-week').addEventListener('click', handleAdminResetWeekly);
  document.getElementById('btn-admin-reset-month').addEventListener('click', handleAdminResetMonthly);

  // Navigation scroll spy
  setupNavScrollSpy();
}

// ----------------- Live Card Preview ----------------- //

function updateLivePreview() {
  if (!elements.previewSenderName) return;

  // Sender
  elements.previewSenderName.textContent = state.currentUser ? state.currentUser.name : 'Bạn';

  // Receiver
  const selectedOpt = elements.receiverSelect.options[elements.receiverSelect.selectedIndex];
  if (selectedOpt && selectedOpt.value) {
    const rawName = selectedOpt.textContent.split('—')[0].trim();
    elements.previewReceiverName.textContent = rawName;
  } else {
    elements.previewReceiverName.textContent = 'Đồng nghiệp được chọn';
  }

  // Points
  elements.previewPointsDisplay.textContent = `+${state.selectedPoints} pts`;

  // Badge
  const badgeIcon = getBadgeIcon(state.selectedBadge);
  elements.previewBadgeDisplay.textContent = `${badgeIcon} ${state.selectedBadge}`;

  // Message
  const msg = elements.messageInput.value.trim();
  if (msg) {
    elements.previewMessageDisplay.textContent = `"${msg}"`;
  } else {
    elements.previewMessageDisplay.textContent = '"Lời cảm ơn và lời tri ân của bạn sẽ được hiển thị trang trọng tại đây..."';
  }
}

// ----------------- API Operations ----------------- //

async function loadUsers() {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  state.allUsers = await res.json();
  renderReceiverDropdown();
  renderUserSwitchList();
}

async function refreshCurrentUser() {
  if (!state.currentUser) return;
  const res = await fetch(`${API_BASE}/user/${state.currentUser.id}`);
  if (res.ok) {
    const freshData = await res.json();
    setCurrentUser(freshData);
  }
}

function setCurrentUser(user) {
  state.currentUser = user;
  localStorage.setItem('viettel_cx_user_id', user.id);

  // Update UI Elements
  elements.currentUserName.textContent = user.name;
  elements.currentUserRole.textContent = `${user.role} • ${user.department.split('-')[0].trim()}`;
  elements.currentUserAvatar.src = user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
  elements.givingBalanceVal.textContent = user.giving_balance;
  
  const welcomeNameEl = document.getElementById('welcome-user-name');
  if (welcomeNameEl) {
    welcomeNameEl.textContent = user.name;
  }
  
  if (elements.balanceReminderVal) {
    elements.balanceReminderVal.textContent = `${user.giving_balance} điểm`;
  }
  if (elements.balanceReminderTag) {
    elements.balanceReminderTag.textContent = `${user.giving_balance} điểm`;
  }

  // Re-render receiver dropdown so current user cannot select themselves
  renderReceiverDropdown();
  renderUserSwitchList();
  updateLivePreview();
}

function renderReceiverDropdown() {
  const currentReceiver = elements.receiverSelect.value;
  elements.receiverSelect.innerHTML = '<option value="">-- Chọn đồng nghiệp để cảm ơn & vinh danh --</option>';
  
  state.allUsers.forEach(u => {
    // Edge case: cannot send to self
    if (state.currentUser && u.id === state.currentUser.id) return;

    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.name} — ${u.role} (${u.department.replace('Viettel CX - ', '')})`;
    elements.receiverSelect.appendChild(opt);
  });

  if (currentReceiver && currentReceiver != state.currentUser?.id) {
    elements.receiverSelect.value = currentReceiver;
  }
}

function renderUserSwitchList() {
  elements.userSwitchList.innerHTML = '';
  state.allUsers.forEach(u => {
    const isCurrent = state.currentUser && state.currentUser.id === u.id;
    const item = document.createElement('div');
    item.className = `user-switch-item ${isCurrent ? 'active' : ''}`;
    item.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="${u.avatar}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid ${isCurrent ? '#EE0033' : '#E2E8F0'};" />
        <div>
          <div style="font-size:0.9rem; font-weight:700; color:#0F172A;">
            ${escapeHtml(u.name)} ${isCurrent ? '<span style="color:#EE0033; font-size:0.75rem; font-weight:700;">(Đang chọn)</span>' : ''}
          </div>
          <div style="font-size:0.74rem; color:#64748B;">${escapeHtml(u.role)} • ${escapeHtml(u.department.replace('Viettel CX - ', ''))}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:0.9rem; font-weight:800; color:#10B981;">${u.giving_balance} pts</div>
        <div style="font-size:0.68rem; color:#94A3B8; font-weight:600;">Quỹ trao tặng</div>
      </div>
    `;
    item.addEventListener('click', () => {
      setCurrentUser(u);
      closeUserSwitchModal();
      showToast('Đã chuyển tài khoản', `Bạn đang trải nghiệm với tư cách: ${u.name}`, 'info');
      loadFeed();
    });
    elements.userSwitchList.appendChild(item);
  });
}

function openUserSwitchModal() {
  elements.userSwitchModal.classList.add('active');
}
function closeUserSwitchModal() {
  elements.userSwitchModal.classList.remove('active');
}

// ----------------- Transfer Action ----------------- //

async function handleTransferSubmit(e) {
  e.preventDefault();
  if (state.isSubmitting) return;

  const receiverId = parseInt(elements.receiverSelect.value);
  const points = parseInt(elements.pointsInput.value);
  const message = elements.messageInput.value.trim();

  // 1. Validation checks
  if (!receiverId) {
    showToast('Thiếu thông tin', 'Vui lòng chọn đồng nghiệp bạn muốn trao tặng điểm.', 'error');
    elements.receiverSelect.focus();
    return;
  }

  if (receiverId === state.currentUser.id) {
    showToast('Không hợp lệ', 'Bạn không thể tự tặng điểm vinh danh cho chính mình!', 'error');
    return;
  }

  if (isNaN(points) || points <= 0) {
    showToast('Điểm không hợp lệ', 'Số điểm gửi phải là số nguyên dương lớn hơn 0.', 'error');
    elements.pointsInput.focus();
    return;
  }

  if (points > state.currentUser.giving_balance) {
    showToast('Số dư không đủ', `Bạn chỉ còn ${state.currentUser.giving_balance} điểm trong tuần này. Vui lòng chọn số điểm phù hợp.`, 'error');
    elements.pointsInput.focus();
    return;
  }

  if (message.length < 3) {
    showToast('Lời cảm ơn quá ngắn', 'Hãy viết một lời cảm ơn chân thành (ít nhất 3 ký tự) để tạo niềm vui cho đồng nghiệp!', 'error');
    elements.messageInput.focus();
    return;
  }

  // 2. Debounce & Loading state
  setSubmitting(true);

  try {
    const payload = {
      sender_id: state.currentUser.id,
      receiver_id: receiverId,
      points: points,
      message: message,
      badge: state.selectedBadge
    };

    const res = await fetch(`${API_BASE}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || 'Có lỗi xảy ra khi thực hiện tặng điểm');
    }

    // 3. Success celebration
    if (window.triggerConfetti) {
      window.triggerConfetti(150);
    }

    showToast('Gửi vinh danh thành công! 🎉', `Bạn đã trao tặng ${points} điểm kèm lời tri ân tới ${data.receiver_name}.`, 'success');

    // Reset Form
    elements.messageInput.value = '';
    elements.charCounter.textContent = '0/300';
    elements.receiverSelect.value = '';
    updateLivePreview();
    
    // Refresh all data
    await Promise.all([
      refreshCurrentUser(),
      loadUsers(),
      loadFeed(),
      loadLeaderboard(state.leaderboardType),
      loadStats()
    ]);

  } catch (err) {
    console.error('Transfer error:', err);
    showToast('Thao tác không thành công', err.message, 'error');
  } finally {
    setSubmitting(false);
  }
}

function setSubmitting(loading) {
  state.isSubmitting = loading;
  if (loading) {
    elements.transferBtn.disabled = true;
    elements.transferBtn.innerHTML = `<span class="spinner"></span> <span>Đang xử lý giao dịch...</span>`;
  } else {
    elements.transferBtn.disabled = false;
    elements.transferBtn.innerHTML = `<span>Gửi Vinh Danh & Trao Điểm</span> <span class="btn-icon">🚀</span>`;
  }
}

// ----------------- Feed / Recognition Wall ----------------- //

async function loadFeed() {
  try {
    const res = await fetch(`${API_BASE}/feed?limit=30`);
    if (!res.ok) return;
    let list = await res.json();

    // 1. Filter by mine
    if (state.feedFilter === 'mine' && state.currentUser) {
      list = list.filter(item => item.sender_id === state.currentUser.id || item.receiver_id === state.currentUser.id);
    }

    // 2. Filter by Core Value badge
    if (state.feedBadgeFilter !== 'all') {
      list = list.filter(item => item.badge === state.feedBadgeFilter);
    }

    renderFeed(list);
  } catch (e) {
    console.error('Failed to load feed:', e);
  }
}

function renderFeed(items) {
  if (items.length === 0) {
    elements.feedList.innerHTML = `
      <div style="text-align:center; padding: 48px 20px; background:#FFFFFF; border-radius:18px; border:1.5px dashed #E2E8F0; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
        <div style="font-size:2.4rem; margin-bottom:10px;">💌</div>
        <div style="font-weight:700; font-size:1.05rem; color:#0F172A;">Chưa có lượt vinh danh nào phù hợp bộ lọc</div>
        <div style="font-size:0.85rem; color:#64748B; margin-top:6px; max-width:380px; margin-left:auto; margin-right:auto;">
          Hãy là người đầu tiên trao gửi lời cảm ơn và lan tỏa tinh thần Viettel CX xuất sắc!
        </div>
      </div>
    `;
    return;
  }

  elements.feedList.innerHTML = items.map(t => {
    const timeFormatted = formatRelativeTime(t.created_at);
    const isLiked = state.likedTransactions.has(t.id);
    const badgeIcon = getBadgeIcon(t.badge);

    return `
      <div class="feed-card" data-id="${t.id}">
        <div class="feed-meta-row">
          <div class="peer-transfer-parties">
            <div class="party-person">
              <img class="party-avatar" src="${t.sender_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" alt="${t.sender_name}" />
              <div>
                <div class="party-name">${escapeHtml(t.sender_name)}</div>
                <div class="party-dept">Người gửi</div>
              </div>
            </div>

            <div class="transfer-arrow-icon" title="Trao tặng">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>

            <div class="party-person">
              <img class="party-avatar" src="${t.receiver_avatar || 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'}" alt="${t.receiver_name}" />
              <div>
                <div class="party-name">${escapeHtml(t.receiver_name)}</div>
                <div class="party-dept">Người nhận</div>
              </div>
            </div>
          </div>

          <div class="transfer-badge-points">
            <div class="core-tag-badge">${badgeIcon} ${escapeHtml(t.badge)}</div>
            <div class="points-pill-badge">
              <span>+${t.points}</span>
              <span style="font-size:0.75rem;">pts</span>
            </div>
          </div>
        </div>

        <div class="feed-quote">
          "${escapeHtml(t.message)}"
        </div>

        <div class="feed-footer-row">
          <div class="feed-time">
            🕒 ${timeFormatted}
          </div>
          <div class="feed-reactions">
            <button class="reaction-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(${t.id})">
              <span>${isLiked ? '❤️' : '🤍'}</span>
              <span>${isLiked ? 'Đã thích' : 'Thả tim'}</span>
            </button>
            <button class="reaction-btn" onclick="sendQuickCheer('${escapeHtml(t.receiver_name)}')">
              <span>👏</span>
              <span>Chúc mừng</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleLike = function (id) {
  if (state.likedTransactions.has(id)) {
    state.likedTransactions.delete(id);
  } else {
    state.likedTransactions.add(id);
    showToast('Đã thả tim ❤️', 'Bạn vừa lan tỏa sự trân trọng tới đồng nghiệp!', 'info');
  }
  loadFeed();
};

window.sendQuickCheer = function (name) {
  if (window.triggerConfetti) {
    window.triggerConfetti(60);
  }
  showToast('Đã gửi lời chúc mừng! 👏', `Bạn vừa gửi tràng pháo tay nồng nhiệt chúc mừng đồng nghiệp ${name}.`, 'success');
};

// ----------------- Leaderboard ----------------- //

async function loadLeaderboard(type = 'weekly') {
  try {
    const res = await fetch(`${API_BASE}/leaderboard?type=${type}`);
    if (!res.ok) return;
    const users = await res.json();
    renderLeaderboard(users);
  } catch (e) {
    console.error('Failed to load leaderboard:', e);
  }
}

function renderLeaderboard(users) {
  if (!users || users.length === 0) {
    elements.podiumContainer.innerHTML = '';
    elements.leaderboardList.innerHTML = '<div style="color:#64748B; font-size:0.85rem; text-align:center; padding: 20px;">Chưa có dữ liệu xếp hạng</div>';
    return;
  }

  // Top 3 Podium
  const top1 = users[0];
  const top2 = users[1];
  const top3 = users[2];

  let podiumHtml = '';

  if (top2) {
    podiumHtml += `
      <div class="podium-slot rank-2">
        <div class="podium-avatar-wrap">
          <img class="podium-avatar" src="${top2.avatar}" alt="${top2.name}" />
        </div>
        <div class="podium-name">${escapeHtml(top2.name)}</div>
        <div class="podium-points">${top2.points} pts</div>
        <span class="podium-rank-tag">Top 2 Bạc</span>
      </div>
    `;
  }

  if (top1) {
    podiumHtml += `
      <div class="podium-slot rank-1">
        <div class="podium-avatar-wrap">
          <div class="podium-crown-badge">👑</div>
          <img class="podium-avatar" src="${top1.avatar}" alt="${top1.name}" />
        </div>
        <div class="podium-name">${escapeHtml(top1.name)}</div>
        <div class="podium-points">${top1.points} pts</div>
        <span class="podium-rank-tag">Top 1 Quán Quân</span>
      </div>
    `;
  }

  if (top3) {
    podiumHtml += `
      <div class="podium-slot rank-3">
        <div class="podium-avatar-wrap">
          <img class="podium-avatar" src="${top3.avatar}" alt="${top3.name}" />
        </div>
        <div class="podium-name">${escapeHtml(top3.name)}</div>
        <div class="podium-points">${top3.points} pts</div>
        <span class="podium-rank-tag">Top 3 Đồng</span>
      </div>
    `;
  }

  elements.podiumContainer.innerHTML = podiumHtml;

  // Rank 4+ List
  const remaining = users.slice(3);
  if (remaining.length === 0) {
    elements.leaderboardList.innerHTML = '';
    return;
  }

  elements.leaderboardList.innerHTML = remaining.map(u => `
    <div class="leaderboard-row">
      <div class="row-left">
        <div class="row-rank">#${u.rank}</div>
        <img class="row-avatar" src="${u.avatar}" alt="${u.name}" />
        <div class="row-info">
          <h4>${escapeHtml(u.name)}</h4>
          <p>${escapeHtml(u.role)}</p>
        </div>
      </div>
      <div class="row-points">${u.points} pts</div>
    </div>
  `).join('');
}

// ----------------- Stats Counters ----------------- //

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) return;
    const stats = await res.json();
    elements.statTotalRecognitions.textContent = stats.total_recognitions;
    elements.statTotalPoints.textContent = stats.total_points_sent.toLocaleString();
    elements.statActiveEmployees.textContent = stats.active_employees;
    elements.statWeekPoints.textContent = stats.current_week_points.toLocaleString();
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

// ----------------- Admin Trigger Handlers ----------------- //

async function handleAdminResetWeekly() {
  if (!confirm('Bạn có chắc chắn muốn kích hoạt chạy thử Cronjob: Reset quỹ điểm tuần (200 điểm) và bảng xếp hạng tuần về 0 không?')) return;
  try {
    const res = await fetch(`${API_BASE}/admin/reset-weekly`, { method: 'POST' });
    const data = await res.json();
    showToast('Reset tuần thành công', data.message, 'success');
    await loadInitialData();
  } catch (e) {
    showToast('Lỗi', 'Không thể kích hoạt reset tuần', 'error');
  }
}

async function handleAdminResetMonthly() {
  if (!confirm('Bạn có chắc chắn muốn kích hoạt chạy thử Cronjob: Reset điểm nhận tháng về 0 không?')) return;
  try {
    const res = await fetch(`${API_BASE}/admin/reset-monthly`, { method: 'POST' });
    const data = await res.json();
    showToast('Reset tháng thành công', data.message, 'success');
    await loadInitialData();
  } catch (e) {
    showToast('Lỗi', 'Không thể kích hoạt reset tháng', 'error');
  }
}

// ----------------- Countdown Timer to Sunday 23:59 ----------------- //

function initCountdownTimer() {
  function updateTimer() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday
    const daysUntilSunday = (7 - dayOfWeek) % 7;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(23, 59, 59, 999);

    let diff = nextSunday - now;
    if (diff < 0) diff = 0;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);

    if (elements.countdownTimer) {
      elements.countdownTimer.textContent = `${days} ngày ${hours} giờ ${minutes} phút`;
    }
  }

  updateTimer();
  setInterval(updateTimer, 60000);
}

// ----------------- Navigation Scroll Spy ----------------- //

function setupNavScrollSpy() {
  const sections = document.querySelectorAll('section[id], div[id^="section-"]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (current && link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });
}

// ----------------- Helper Functions ----------------- //

function getBadgeIcon(badge) {
  switch (badge) {
    case 'Tận tâm': return '🌟';
    case 'Sáng tạo': return '💡';
    case 'Đồng đội': return '🤝';
    case 'Bứt phá': return '🚀';
    case 'Thấu hiểu': return '👂';
    default: return '✨';
  }
}

function formatRelativeTime(dateStr) {
  try {
    const date = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Vừa xong';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  } catch (e) {
    return 'Gần đây';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function (m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
    }
  });
}

function showToast(title, desc, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? '🎉' : type === 'error' ? '⚠️' : 'ℹ️';

  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-desc">${escapeHtml(desc)}</div>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

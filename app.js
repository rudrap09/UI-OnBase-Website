const loginPageEl = document.getElementById('login-page');
const loginForm = document.getElementById('login-form');
const loginFeedbackEl = document.getElementById('login-feedback');
const logoutButton = document.getElementById('logout-button');
const appContainerEl = document.getElementById('app-container');
const documentListEl = document.getElementById('document-list');
const documentDetailsEl = document.getElementById('document-details');
const resultCountEl = document.getElementById('result-count');
const docCountEl = document.getElementById('doc-count');
const nonScannedCountEl = document.getElementById('non-scanned-count');
const recentUploadEl = document.getElementById('recent-upload');
const uploadFeedbackEl = document.getElementById('upload-feedback');
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const navButtons = document.querySelectorAll('.nav-item');
const tabPanels = document.querySelectorAll('.tab-panel');

const sampleDocuments = [
  {
    id: 'DOC-001',
    title: 'Acme Solvent Safety Data Sheet',
    manufacturer: 'Acme Chemicals',
    material: 'Solvent X',
    type: 'msds',
    status: 'Verified',
    uploaded: '2024-02-11',
    summary: 'Full SDS for storage and handling of Solvent X.',
  },
  {
    id: 'DOC-002',
    title: 'Mixing Compound 12',
    manufacturer: 'Spray Systems Co.',
    material: 'Compound 12',
    type: 'msds',
    status: 'Available',
    uploaded: '2024-05-02',
    summary: 'MSDS describing hazards and PPE requirements.',
    attachment: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  },
  {
    id: 'DOC-003',
    title: 'Custom Hazard Form',
    manufacturer: 'User Submitted',
    material: 'Non-Scanned MSDS',
    type: 'non-scanned',
    status: 'Pending Review',
    uploaded: '2025-12-10',
    summary: 'Non-scanned MSDS record with supporting file details.',
    attachment: 'hazard-form.docx',
  },
];

const AUTH_USERNAME = 'admin';
const AUTH_PASSWORD = 'OnBase123!';

const VALID_USERS = {
  'admin': 'OnBase123!',
  'Facilities': 'Facilities123!'
};

let documents = loadDocuments();
let selectedDocumentId = null;
let currentPdfObjectUrl = null;

function loadDocuments() {
  try {
    const saved = localStorage.getItem('onbaseDocuments');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Local storage parse failed', error);
  }
  localStorage.setItem('onbaseDocuments', JSON.stringify(sampleDocuments));
  return sampleDocuments;
}

function saveDocuments() {
  localStorage.setItem('onbaseDocuments', JSON.stringify(documents));
}

function formatDocumentCard(doc) {
  return `
    <button class="document-card" data-id="${doc.id}">
      <h4>${doc.title}</h4>
      <p>${doc.manufacturer} · ${doc.material}</p>
      <p><strong>${doc.type === 'non-scanned' ? 'Non-Scanned MSDS' : 'MSDS'}</strong> · ${doc.status}</p>
    </button>
  `;
}

function isAuthenticated() {
  return localStorage.getItem('onbaseAuth') === 'true';
}

function getLoggedInUser() {
  return localStorage.getItem('onbaseUser');
}

function isFacilitiesUser() {
  return getLoggedInUser() === 'Facilities';
}

function showApp(show) {
  if (show) {
    loginPageEl.classList.add('hidden');
    appContainerEl.classList.remove('hidden');
  } else {
    loginPageEl.classList.remove('hidden');
    appContainerEl.classList.add('hidden');
  }
}

function renderList() {
  const query = searchInput.value.toLowerCase().trim();
  const category = categoryFilter.value;
  const filtered = documents.filter((doc) => {
    const matchesQuery =
      doc.title.toLowerCase().includes(query) ||
      doc.manufacturer.toLowerCase().includes(query) ||
      doc.material.toLowerCase().includes(query) ||
      doc.summary?.toLowerCase().includes(query);
    const matchesCategory = category === 'all' || doc.type === category;
    return matchesQuery && matchesCategory;
  });

  documentListEl.innerHTML = filtered.map(formatDocumentCard).join('') || '<p class="empty-state">No documents match this search.</p>';
  resultCountEl.textContent = `${filtered.length} found`;
  if (docCountEl) docCountEl.textContent = documents.length;
  nonScannedCountEl.textContent = documents.filter((doc) => doc.type === 'non-scanned').length;
  if (!filtered.length) {
    documentDetailsEl.innerHTML = '<p class="empty-state">No document selected.</p>';
  }
  bindDocumentActions();
}

function bindDocumentActions() {
  documentListEl.querySelectorAll('.document-card').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.document-card').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      selectedDocumentId = button.dataset.id;
      renderDetails();
    });
  });
}

function deleteSelectedDocument() {
  if (!selectedDocumentId) return;
  const selected = documents.find((doc) => doc.id === selectedDocumentId);
  if (!selected) return;
  if (!confirm(`Delete document '${selected.title}'?`)) return;
  documents = documents.filter((doc) => doc.id !== selectedDocumentId);
  saveDocuments();
  selectedDocumentId = null;
  uploadFeedbackEl.textContent = `Removed document: ${selected.title}`;
  renderList();
  documentDetailsEl.innerHTML = '<p class="empty-state">Select a document to view its details.</p>';
}

function renderDetails() {
  const selected = documents.find((doc) => doc.id === selectedDocumentId);
  if (!selected) {
    documentDetailsEl.innerHTML = '<p class="empty-state">Select a document to view its details.</p>';
    return;
  }
  // revoke previous blob URL if present
  if (currentPdfObjectUrl) {
    URL.revokeObjectURL(currentPdfObjectUrl);
    currentPdfObjectUrl = null;
  }
  let attachmentHtml = '';
  if (selected.attachment) {
    const att = selected.attachment;
    const isUrl = /^https?:\/\//i.test(att) || /^data:/i.test(att);
    const isDataPdf = /^data:application\/pdf/i.test(att);
    const isPdf = isDataPdf || /\.pdf$/i.test(att) || (isUrl && att.toLowerCase().includes('.pdf'));
    if (isPdf) {
      let iframeSrc = att;
      // if we have a data: PDF, convert to a Blob URL for better browser support (Edge)
      if (isDataPdf) {
        function dataURLtoBlob(dataurl) {
          const parts = dataurl.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
          const bstr = atob(parts[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) u8arr[n] = bstr.charCodeAt(n);
          return new Blob([u8arr], { type: mime });
        }
        try {
          const blob = dataURLtoBlob(att);
          iframeSrc = URL.createObjectURL(blob);
          currentPdfObjectUrl = iframeSrc;
        } catch (err) {
          console.error('Failed to convert data URL to Blob', err);
        }
      }

      attachmentHtml = `
        <div class="detail-row"><strong>Attachment</strong>
          <div><a href="${iframeSrc}" target="_blank" rel="noopener">Open PDF in new tab</a></div>
          <div class="pdf-container"><iframe class="pdf-viewer" src="${iframeSrc}" frameborder="0"></iframe></div>
        </div>
      `;
    } else {
      attachmentHtml = `<div class="detail-row"><strong>Attachment</strong><span>${att}</span></div>`;
    }
  }

  documentDetailsEl.innerHTML = `
    <div class="detail-row"><strong>Title</strong><span>${selected.title}</span></div>
    <div class="detail-row"><strong>Manufacturer</strong><span>${selected.manufacturer}</span></div>
    <div class="detail-row"><strong>Material/Product</strong><span>${selected.material}</span></div>
    <div class="detail-row"><strong>Document Type</strong><span>${selected.type === 'non-scanned' ? 'Non-Scanned MSDS' : 'MSDS'}</span></div>
    <div class="detail-row"><strong>Status</strong><span>${selected.status}</span></div>
    <div class="detail-row"><strong>Upload Date</strong><span>${selected.uploaded}</span></div>
    <div class="detail-row"><strong>Description</strong><span>${selected.summary || 'No description provided.'}</span></div>
    ${attachmentHtml}
    ${!isFacilitiesUser() ? '<div class="detail-row"><button id="delete-document-btn" class="secondary-btn">Delete Document</button></div>' : ''}
  `;
  const deleteButton = document.getElementById('delete-document-btn');
  if (deleteButton) {
    deleteButton.addEventListener('click', deleteSelectedDocument);
  }
}

function showPanel(panelId) {
  tabPanels.forEach((panel) => panel.classList.toggle('active', panel.id === panelId));
  navButtons.forEach((button) => button.classList.toggle('active', button.dataset.panel === panelId));
  
  // Render issues when reports panel is opened
  if (panelId === 'reports-panel') {
    renderIssues();
  }
}

function renderIssues() {
  const issuesListEl = document.getElementById('issues-list');
  if (!issuesListEl) return;

  let issues = [];
  try {
    const saved = localStorage.getItem('onbaseIssues');
    if (saved) {
      issues = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load issues', error);
  }

  // Filter issues based on user role
  let filteredIssues = issues;
  if (isFacilitiesUser()) {
    filteredIssues = issues.filter((issue) => issue.submittedBy === getLoggedInUser());
  }

  if (filteredIssues.length === 0) {
    issuesListEl.innerHTML = '<p class="empty-state">No issues submitted.</p>';
    return;
  }

  const issuesHtml = filteredIssues.map((issue) => `
    <div class="issue-card">
      <div class="issue-header">
        <h4>${issue.title}</h4>
        <span class="issue-category">${issue.category}</span>
      </div>
      <p class="issue-description">${issue.description}</p>
      <div class="issue-meta">
        <span>Submitted by: ${issue.submittedBy}</span>
        <span>Date: ${new Date(issue.submittedAt).toLocaleDateString()}</span>
      </div>
    </div>
  `).join('');

  issuesListEl.innerHTML = issuesHtml;
}

navButtons.forEach((button) => {
  button.addEventListener('click', () => showPanel(button.dataset.panel));
});

searchInput.addEventListener('input', renderList);
categoryFilter.addEventListener('change', renderList);

const uploadForm = document.getElementById('upload-form');

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  if (VALID_USERS[username] && VALID_USERS[username] === password) {
    localStorage.setItem('onbaseAuth', 'true');
    localStorage.setItem('onbaseUser', username);
    loginFeedbackEl.textContent = '';
    showApp(true);
    applyUserPermissions();
    renderList();
    return;
  }
  loginFeedbackEl.textContent = 'Invalid username or password.';
});

function applyUserPermissions() {
  const reportsPanelNav = document.querySelector('[data-panel="reports-panel"]');
  const issueNavBtn = document.getElementById('issue-nav-btn');
  
  // Hide Reports menu from Facilities users (they can't see all issues)
  if (reportsPanelNav) {
    if (isFacilitiesUser()) {
      reportsPanelNav.style.display = 'none';
    } else {
      reportsPanelNav.style.display = '';
    }
  }
  
  // Show Report Issue menu to all users (both can report issues)
  if (issueNavBtn) {
    issueNavBtn.style.display = '';
  }
}

if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('onbaseAuth');
    localStorage.removeItem('onbaseUser');
    selectedDocumentId = null;
    showApp(false);
  });
}

uploadForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const title = document.getElementById('doc-title').value.trim();
  const manufacturer = document.getElementById('manufacturer').value.trim();
  const material = document.getElementById('material').value.trim();
  const description = document.getElementById('description').value.trim();
  const fileInput = document.getElementById('document-file');
  const file = fileInput.files[0];
  const fileName = file?.name || 'No attachment provided';

  if (!title || !manufacturer || !material) {
    uploadFeedbackEl.textContent = 'Please fill in the required fields.';
    return;
  }
  function finishAdd(attachmentValue) {
    const newDocument = {
      id: `DOC-${String(documents.length + 1).padStart(3, '0')}`,
      title,
      manufacturer,
      material,
      type: 'non-scanned',
      status: 'Pending Review',
      uploaded: new Date().toISOString().slice(0, 10),
      summary: description || 'Non-scanned document submitted through the UI.',
      attachment: attachmentValue,
      attachmentName: fileName,
    };

    documents.unshift(newDocument);
    saveDocuments();
    renderList();
    uploadFeedbackEl.textContent = `Added non-scanned MSDS: ${title}`;
    recentUploadEl.textContent = title;
    uploadForm.reset();
    showPanel('search-panel');
  }

  if (file) {
    // If PDF, read as data URL so it can be embedded and persist in localStorage
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (e) => {
        finishAdd(e.target.result);
      };
      reader.readAsDataURL(file);
      return;
    }
    // For other file types, just store the filename (no inline preview)
    finishAdd(fileName);
    return;
  }

  finishAdd(fileName);
});

const issueForm = document.getElementById('issue-form');
const issueFeedbackEl = document.getElementById('issue-feedback');

issueForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const title = document.getElementById('issue-title').value.trim();
  const category = document.getElementById('issue-category').value.trim();
  const description = document.getElementById('issue-description').value.trim();

  if (!title || !category || !description) {
    issueFeedbackEl.textContent = 'Please fill in all required fields.';
    return;
  }

  const issue = {
    id: `ISSUE-${Date.now()}`,
    title,
    category,
    description,
    submittedBy: getLoggedInUser(),
    submittedAt: new Date().toISOString(),
  };

  // Store issue in localStorage
  let issues = [];
  try {
    const saved = localStorage.getItem('onbaseIssues');
    if (saved) {
      issues = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load issues', error);
  }

  issues.push(issue);
  localStorage.setItem('onbaseIssues', JSON.stringify(issues));
  issueFeedbackEl.textContent = `Issue submitted successfully: "${title}"`;
  issueForm.reset();
});

if (isAuthenticated()) {
  showApp(true);
  applyUserPermissions();
  renderList();
} else {
  showApp(false);
}

// Hosting modal toggle
const hostingLink = document.getElementById('hosting-link');
const hostingModal = document.getElementById('hosting-modal');
const hostingClose = document.getElementById('hosting-close');
if (hostingLink && hostingModal) {
  hostingLink.addEventListener('click', () => {
    hostingModal.setAttribute('aria-hidden', 'false');
  });
}
if (hostingClose && hostingModal) {
  hostingClose.addEventListener('click', () => {
    hostingModal.setAttribute('aria-hidden', 'true');
  });
  hostingModal.addEventListener('click', (e) => {
    if (e.target === hostingModal) hostingModal.setAttribute('aria-hidden', 'true');
  });
}

// Initialize on page load
if (isAuthenticated()) {
  showApp(true);
  applyUserPermissions();
  renderList();
}

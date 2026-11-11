/**
 * AtCoder Pulse Content Script
 * Injected into atcoder.jp/users/* pages to add analytics and unsolved tracking.
 */

(function () {
  'use strict';

  // Extract username from URL: /users/<username>
  const match = window.location.pathname.match(/^\/users\/([a-zA-Z0-9_-]+)/);
  if (!match) return;
  const username = match[1];

  // Avoid running on non-user subpages like /users/xxx/history if already handled
  console.log(`[AtCoder Pulse] Initializing for user: ${username}`);

  function initPulseExtension() {
    // Locate AtCoder nav-tabs
    const navTabs = document.querySelector('#user-nav-tabs');
    const mainContainer = document.querySelector('#main-container');
    if (!navTabs || !mainContainer) {
      setTimeout(initPulseExtension, 300);
      return;
    }

    // Check if already injected
    if (document.querySelector('#atcoder-pulse-tab')) return;

    // 1. Create Pulse Tab in AtCoder's native navbar
    const pulseTabLi = document.createElement('li');
    pulseTabLi.id = 'atcoder-pulse-tab';
    pulseTabLi.innerHTML = `
      <a href="#pulse" id="ac-pulse-tab-link" style="cursor: pointer;">
        <span class="glyphicon glyphicon-stats" style="color: #38bdf8; margin-right: 4px;"></span>
        <b style="background: linear-gradient(135deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Pulse Analytics & Unsolved</b>
      </a>
    `;
    navTabs.appendChild(pulseTabLi);

    // 2. Create the Pulse container
    const pulseContainer = document.createElement('div');
    pulseContainer.id = 'atcoder-pulse-container';
    pulseContainer.style.display = 'none';

    // Insert right after the nav tabs row
    const tabsRow = navTabs.closest('.row');
    if (tabsRow && tabsRow.parentNode) {
      tabsRow.parentNode.insertBefore(pulseContainer, tabsRow.nextSibling);
    } else {
      mainContainer.appendChild(pulseContainer);
    }

    // Identify native profile content siblings to toggle visibility
    const nativeProfileElements = [];
    let sibling = tabsRow ? tabsRow.nextElementSibling : null;
    while (sibling) {
      if (sibling !== pulseContainer && sibling.id !== 'atcoder-pulse-container') {
        nativeProfileElements.push(sibling);
      }
      sibling = sibling.nextElementSibling;
    }

    // Instantiate Dashboard
    const dashboard = new AtCoderDashboard(username, pulseContainer);
    let isDashboardLoaded = false;

    // Function to activate Pulse view
    function showPulseView() {
      // Deactivate other tabs
      navTabs.querySelectorAll('li').forEach(li => li.classList.remove('active'));
      pulseTabLi.classList.add('active');

      // Hide native profile content
      nativeProfileElements.forEach(el => {
        el.setAttribute('data-pulse-prev-display', el.style.display || '');
        el.style.display = 'none';
      });

      // Show pulse container
      pulseContainer.style.display = 'block';

      if (!isDashboardLoaded) {
        dashboard.loadInitialData();
        isDashboardLoaded = true;
      } else {
        dashboard.scrollHeatmapToRight();
      }
    }

    // Function to restore native view
    function showNativeView() {
      pulseTabLi.classList.remove('active');
      pulseContainer.style.display = 'none';

      nativeProfileElements.forEach(el => {
        const prev = el.getAttribute('data-pulse-prev-display');
        el.style.display = prev !== null ? prev : '';
      });
    }

    // Click handler for our custom tab
    const tabLink = pulseTabLi.querySelector('#ac-pulse-tab-link');
    tabLink.addEventListener('click', (e) => {
      e.preventDefault();
      history.pushState(null, null, '#pulse');
      showPulseView();
    });

    // Native tabs click handler (Profile, History, etc.)
    navTabs.querySelectorAll('li:not(#atcoder-pulse-tab) a').forEach(a => {
      a.addEventListener('click', () => {
        showNativeView();
      });
    });

    // Auto-open if hash is #pulse or #analytics
    if (window.location.hash === '#pulse' || window.location.hash === '#analytics') {
      showPulseView();
    }

    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#pulse' || window.location.hash === '#analytics') {
        showPulseView();
      } else if (!window.location.hash) {
        showNativeView();
      }
    });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPulseExtension);
  } else {
    initPulseExtension();
  }
})();


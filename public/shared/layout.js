(function () {
  const isGames = /^(www\.)?amblyopia\.games$/.test(location.hostname)
    || location.hostname === 'localhost';
  const isAuthPage = location.pathname.startsWith("/auth");

  // ── Google Analytics ─────────────────────────────────────────────────────
  const gaId = isGames ? "G-RZ74FQ0TFR" : "G-V2SYXJZL63";
  const gaScript = document.createElement("script");
  gaScript.async = true;
  gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(gaScript);
  const gaInit = document.createElement("script");
  gaInit.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;
  document.head.appendChild(gaInit);

  // ── Theme tokens ─────────────────────────────────────────────────────────
  const varStyle = document.createElement("style");
  varStyle.textContent = isGames
    ? `
    :root {
      --sl-header-bg:    #0a0e1a;
      --sl-header-bd:    #1e2740;
      --sl-logo:         #ffffff;
      --sl-logo-accent:  #4fc3f7;
      --sl-nav-link:     #8899bb;
      --sl-nav-hover:    #e8eaf0;
      --sl-btn-bg:       #4fc3f7;
      --sl-btn-text:     #0a0e1a;
      --sl-btn-hover:    #81d4fa;
      --sl-ubtn-bd:      #1e2740;
      --sl-ubtn-bd-h:    #2e4060;
      --sl-ubtn-text:    #c5cfe8;
      --sl-ubtn-text-h:  #e8eaf0;
      --sl-avatar-bg:    #1e2740;
      --sl-avatar-bd:    #2e4060;
      --sl-avatar-text:  #4fc3f7;
      --sl-drop-bg:      #0f1525;
      --sl-drop-bd:      #1e2740;
      --sl-drop-shadow:  0 8px 24px rgba(0,0,0,0.4);
      --sl-drop-name:    #e8eaf0;
      --sl-drop-email:   #5a6a80;
      --sl-drop-role:    #4fc3f7;
      --sl-drop-item:    #8899bb;
      --sl-drop-item-h-bg:   #1a2540;
      --sl-drop-item-h-text: #e8eaf0;
      --sl-signout:      #f87171;
      --sl-signout-h-bg: rgba(248,113,113,0.08);
      --sl-footer-bd:    #1e2740;
      --sl-footer-text:  #4a5a70;
      --sl-footer-hover: #8899bb;
    }
  `
    : `
    :root {
      --sl-header-bg:    #f5f7fa;
      --sl-header-bd:    #e2e8f0;
      --sl-logo:         #1e293b;
      --sl-logo-accent:  #0369a1;
      --sl-nav-link:     #64748b;
      --sl-nav-hover:    #1e293b;
      --sl-btn-bg:       #0369a1;
      --sl-btn-text:     #ffffff;
      --sl-btn-hover:    #0284c7;
      --sl-ubtn-bd:      #e2e8f0;
      --sl-ubtn-bd-h:    #cbd5e1;
      --sl-ubtn-text:    #334155;
      --sl-ubtn-text-h:  #1e293b;
      --sl-avatar-bg:    #e8f0f8;
      --sl-avatar-bd:    #cbd5e1;
      --sl-avatar-text:  #0369a1;
      --sl-drop-bg:      #ffffff;
      --sl-drop-bd:      #e2e8f0;
      --sl-drop-shadow:  0 8px 24px rgba(0,0,0,0.10);
      --sl-drop-name:    #1e293b;
      --sl-drop-email:   #64748b;
      --sl-drop-role:    #0369a1;
      --sl-drop-item:    #475569;
      --sl-drop-item-h-bg:   #f1f5f9;
      --sl-drop-item-h-text: #1e293b;
      --sl-signout:      #dc2626;
      --sl-signout-h-bg: rgba(220,38,38,0.06);
      --sl-footer-bd:    #e2e8f0;
      --sl-footer-text:  #94a3b8;
      --sl-footer-hover: #64748b;
    }
  `;
  document.head.appendChild(varStyle);

  // ── Layout styles ─────────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    .sl-header {
      padding: 20px 32px;
      background: var(--sl-header-bg);
      border-bottom: 1px solid var(--sl-header-bd);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .sl-logo {
      font-family: Georgia, serif;
      font-size: 1.15rem;
      color: var(--sl-logo);
      text-decoration: none;
    }
    .sl-logo span { color: var(--sl-logo-accent); }
    .sl-nav { display: flex; align-items: center; gap: 8px; }
    .sl-nav a {
      font-family: sans-serif;
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
      padding: 8px 16px;
      border-radius: 4px;
      transition: all 0.15s;
      color: var(--sl-nav-link);
    }
    .sl-nav a:hover { color: var(--sl-nav-hover); }
    .sl-nav a.sl-primary {
      background: var(--sl-btn-bg);
      color: var(--sl-btn-text);
    }
    .sl-nav a.sl-primary:hover { background: var(--sl-btn-hover); color: var(--sl-btn-text); }

    .sl-user-menu { position: relative; font-family: sans-serif; }
    .sl-user-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: none;
      border: 1px solid var(--sl-ubtn-bd);
      border-radius: 4px;
      padding: 7px 14px;
      color: var(--sl-ubtn-text);
      font-family: sans-serif;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
    }
    .sl-user-btn:hover { border-color: var(--sl-ubtn-bd-h); color: var(--sl-ubtn-text-h); }
    .sl-user-btn .sl-avatar {
      width: 24px; height: 24px; border-radius: 50%;
      background: var(--sl-avatar-bg);
      border: 1px solid var(--sl-avatar-bd);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem;
      color: var(--sl-avatar-text);
      flex-shrink: 0;
    }
    .sl-user-btn .sl-caret { font-size: 0.6rem; opacity: 0.5; margin-left: 2px; transition: transform 0.15s; }
    .sl-user-menu.open .sl-caret { transform: rotate(180deg); }

    .sl-dropdown {
      display: none;
      position: absolute;
      top: calc(100% + 8px); right: 0;
      min-width: 200px;
      background: var(--sl-drop-bg);
      border: 1px solid var(--sl-drop-bd);
      border-radius: 4px;
      box-shadow: var(--sl-drop-shadow);
      z-index: 100;
      overflow: hidden;
    }
    .sl-user-menu.open .sl-dropdown { display: block; }
    .sl-dropdown-header { padding: 12px 16px; border-bottom: 1px solid var(--sl-drop-bd); }
    .sl-dropdown-name { font-size: 0.85rem; color: var(--sl-drop-name); font-weight: 600; }
    .sl-dropdown-email { font-size: 0.75rem; color: var(--sl-drop-email); margin-top: 2px; word-break: break-all; }
    .sl-dropdown-role { display: inline-block; margin-top: 6px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: var(--sl-drop-role); }
    .sl-dropdown-item {
      display: block; width: 100%; padding: 11px 16px;
      background: none; border: none; text-align: left;
      font-family: sans-serif; font-size: 0.85rem;
      color: var(--sl-drop-item);
      cursor: pointer;
      transition: background 0.1s, color 0.1s;
      text-decoration: none;
    }
    .sl-dropdown-item:hover { background: var(--sl-drop-item-h-bg); color: var(--sl-drop-item-h-text); }
    .sl-dropdown-item.sl-signout { color: var(--sl-signout); }
    .sl-dropdown-item.sl-signout:hover { background: var(--sl-signout-h-bg); color: var(--sl-signout); }

    .sl-footer { border-top: 1px solid var(--sl-footer-bd); padding: 28px 32px; margin-top: auto; background: var(--sl-header-bg); }
    .sl-footer-inner {
      max-width: 860px; margin: 0 auto;
      display: flex; justify-content: space-between; align-items: center;
      font-family: sans-serif; font-size: 0.8rem;
      color: var(--sl-footer-text);
    }
    .sl-footer-inner a { color: var(--sl-footer-text); text-decoration: none; }
    .sl-footer-inner a:hover { color: var(--sl-footer-hover); }
  `;
  document.head.appendChild(style);

  // ── Header & footer ───────────────────────────────────────────────────────
  const logo = isGames
    ? `<a href="/" class="sl-logo">Amblyopia<span>.games</span></a>`
    : `<a href="/" class="sl-logo">Amblyopia<span>Labs</span></a>`;

  function buildNav() {
    const raw = localStorage.getItem("al_user");
    const user = raw ? JSON.parse(raw) : null;
    const token = localStorage.getItem("al_token");

    const authOrigin = isGames ? "https://www.amblyopialabs.com" : "";

    if (user && token) {
      const nameParts = [user.firstName, user.lastName].filter(Boolean);
      const displayName = nameParts.length ? nameParts.join(" ") : user.email;
      const initials = nameParts.length
        ? nameParts
            .map((p) => p[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : user.email[0].toUpperCase();

      return `
        <div class="sl-user-menu" id="sl-user-menu">
          <button class="sl-user-btn" onclick="document.getElementById('sl-user-menu').classList.toggle('open')">
            <span class="sl-avatar">${initials}</span>
            ${displayName}
            <span class="sl-caret">&#9660;</span>
          </button>
          <div class="sl-dropdown">
            <div class="sl-dropdown-header">
              <div class="sl-dropdown-name">${displayName}</div>
              <div class="sl-dropdown-email">${user.email}</div>
              <span class="sl-dropdown-role">${user.role || ""}</span>
            </div>
            <a href="${authOrigin}/account/" class="sl-dropdown-item">My account</a>
            <button class="sl-dropdown-item sl-signout" onclick="slSignOut()">Sign out</button>
          </div>
        </div>
      `;
    }

    if (isAuthPage) return "";

    const returnTo = encodeURIComponent(location.href);
    return `
      <a href="${authOrigin}/auth/?mode=signin&returnTo=${returnTo}">Sign in</a>
      <a href="${authOrigin}/auth/?mode=signup&returnTo=${returnTo}" class="sl-primary">Sign up</a>
    `;
  }

  document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <header class="sl-header">
      ${logo}
      <nav class="sl-nav">${buildNav()}</nav>
    </header>
  `,
  );

  document.addEventListener("click", function (e) {
    const menu = document.getElementById("sl-user-menu");
    if (menu && !menu.contains(e.target)) menu.classList.remove("open");
  });

  window.slSignOut = function () {
    localStorage.removeItem("al_token");
    localStorage.removeItem("al_user");
    window.location.href = "/";
  };

  const year = new Date().getFullYear();
  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <footer class="sl-footer">
      <div class="sl-footer-inner">
        <span>&copy; ${year} AmblyopiaLabs</span>
      </div>
    </footer>
  `,
  );
})();

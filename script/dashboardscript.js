// ────────────────────────────────────────────────
//  انتظر تحميل الـDOM مرة واحدة فقط
// ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // ── Sidebar Navigation ───────────────────────────────
  const buttons = document.querySelectorAll("aside button:not(#logoutbtn)");
  const title = document.getElementById("button-name");
  const logoutBtn = document.getElementById("logoutbtn");

  const pageMap = {
    "Main":        "main-content",
    "Projects":    "projects-content",
    "Services":    "services-content",
    "Interactions": "interactions-content",
    "Users":       "users-content",
    "Settings":    "settings-content"
  };

  // Default active button
  if (buttons.length > 0) {
    const defaultBtn = buttons[0];
    defaultBtn.classList.add("bg-yellow-600", "text-black");
    title.textContent = defaultBtn.textContent.trim();

    // Hide all except default
    Object.values(pageMap).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add("hidden");
    });

    const defaultContent = document.getElementById(pageMap[defaultBtn.textContent.trim()]);
    if (defaultContent) defaultContent.classList.remove("hidden");
  }

  // Switch pages
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      title.textContent = btn.textContent.trim();

      // Reset all buttons
      buttons.forEach(b => b.classList.remove("bg-yellow-600", "text-black"));

      // Activate clicked
      btn.classList.add("bg-yellow-600", "text-black");

      // Hide all contents
      Object.values(pageMap).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
      });

      // Show target
      const targetId = pageMap[btn.textContent.trim()];
      const target = document.getElementById(targetId);
      if (target) {
        target.classList.remove("hidden");
        // Fade-in
        target.classList.add("opacity-0");
        setTimeout(() => target.classList.remove("opacity-0"), 20);
      }
    });
  });

  // ── Logout with fade ───────────────────────────────
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      document.body.classList.add("opacity-0");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 500);   // ← تأكد إن الـtransition في CSS 500ms
    });
  }

  // ── Projects CRUD & Hide logic ─────────────────────
  const editModal   = document.getElementById("edit-modal");
  const deleteModal = document.getElementById("delete-modal");
  let currentProject = null;

  // Helper: Get hidden projects from storage
  const getHiddenProjects = () => {
    try {
      return JSON.parse(localStorage.getItem("hiddenProjects") || "[]");
    } catch {
      return [];
    }
  };

  // Hide already hidden projects on load
const hiddenIds = getHiddenProjects();
document.querySelectorAll("[data-project-id]").forEach(row => {
    if (hiddenIds.includes(row.getAttribute("data-project-id"))) {
        // بدلاً من hidden، نجعلها باهتة لنستطيع استعادتها
        row.classList.add("opacity-30"); 
        const icon = row.querySelector(".hide-btn i");
        if (icon) {
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
        }
    }
});

  // ── Edit functionality ─────────────────────────────
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentProject = btn.closest("[data-project-id]");
      if (!currentProject) return;

      document.getElementById("edit-title").value = currentProject.querySelector("h3")?.textContent || "";
      document.getElementById("edit-desc").value  = currentProject.querySelector("p")?.textContent  || "";

      editModal?.classList.remove("hidden");
    });
  });

  document.getElementById("edit-close")?.addEventListener("click", () => editModal?.classList.add("hidden"));
  document.getElementById("edit-cancel")?.addEventListener("click", () => editModal?.classList.add("hidden"));

  document.getElementById("edit-form")?.addEventListener("submit", e => {
    e.preventDefault();
    if (!currentProject) return;

    const newTitle = document.getElementById("edit-title")?.value.trim() || "";
    const newDesc  = document.getElementById("edit-desc")?.value.trim()  || "";

    currentProject.querySelector("h3").textContent = newTitle;
    currentProject.querySelector("p").textContent  = newDesc;

    editModal?.classList.add("hidden");
  });

  // ── Delete functionality ───────────────────────────
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentProject = btn.closest("[data-project-id]");
      if (currentProject) deleteModal?.classList.remove("hidden");
    });
  });

  document.getElementById("delete-close")?.addEventListener("click", () => deleteModal?.classList.add("hidden"));
  document.getElementById("delete-no")?.addEventListener("click", () => deleteModal?.classList.add("hidden"));
  document.getElementById("delete-yes")?.addEventListener("click", () => {
    if (currentProject) {
      currentProject.remove();
    }
    deleteModal?.classList.add("hidden");
  });

  // ── Hide / Unhide ──────────────────────────────────
  document.querySelectorAll(".hide-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const row = btn.closest("[data-project-id]");
      if (!row) return;

      const projectId = row.getAttribute("data-project-id");
      const isHiddenNow = row.classList.toggle("hidden");

      let hidden = getHiddenProjects();

      if (isHiddenNow) {
        if (!hidden.includes(projectId)) hidden.push(projectId);
      } else {
        hidden = hidden.filter(id => id !== projectId);
      }

      localStorage.setItem("hiddenProjects", JSON.stringify(hidden));

      // تغيير الأيقونة (eye / eye-slash)
      const icon = btn.querySelector("i");
      if (icon) {
        if (isHiddenNow) {
          icon.classList.remove("fa-eye-slash");
          icon.classList.add("fa-eye");
        } else {
          icon.classList.remove("fa-eye");
          icon.classList.add("fa-eye-slash");
        }
      }
    });
  });
});
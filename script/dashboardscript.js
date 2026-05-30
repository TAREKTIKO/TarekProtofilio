import { supabase } from "./supabase.js";

// ────────────────────────────────────────────────
//  Dashboard Stats & Data Loading
// ────────────────────────────────────────────────

async function loadDashboardStats() {
    try {
        // Fetch counts from database
        const [projectsRes, servicesRes, usersRes, commentsRes] = await Promise.all([
            supabase.from("products").select("id", { count: "exact", head: true }),
            supabase.from("services").select("id", { count: "exact", head: true }),
            supabase.from("users").select("id", { count: "exact", head: true }),
            supabase.from("comments").select("id", { count: "exact", head: true })
        ]);

        // Update stat cards
        const statCards = document.querySelectorAll(".stats-card span");
        if (statCards[0]) statCards[0].textContent = projectsRes.count || 0;
        if (statCards[1]) statCards[1].textContent = servicesRes.count || 0;
        if (statCards[2]) statCards[2].textContent = usersRes.count || 0;
        if (statCards[3]) statCards[3].textContent = commentsRes.count || 0;
    } catch (error) {
        console.error("Error loading dashboard stats:", error);
    }
}

async function loadInteractions() {
    try {
        // Fetch recent comments
        const { data: comments, error } = await supabase
            .from("comments")
            .select(`
                id,
                comment_text,
                created_at,
                users (name),
                product_id,
                service_id
            `)
            .order("created_at", { ascending: false })
            .limit(10);

        if (error) throw error;

        const tbody = document.querySelector("table tbody");
        if (!tbody) return;

        tbody.innerHTML = (comments || []).map((comment, index) => `
            <tr class="border-b border-gray-800 hover:bg-gray-800 transition">
                <td class="py-3">${index + 1}</td>
                <td>${comment.users?.name || "Unknown"}</td>
                <td class="text-green-400">Active</td>
            </tr>
        `).join("");
    } catch (error) {
        console.error("Error loading interactions:", error);
    }
}

async function loadUsersTable() {
    try {
        const { data: users, error } = await supabase
            .from("users")
            .select("id, name, role, email")
            .limit(5);

        if (error) throw error;

        // Find Users section and update its table
        const sections = document.querySelectorAll(".bg-gray-900.p-6.rounded-2xl");
        const usersSection = Array.from(sections).find(s => s.textContent.includes("Users"));
        
        if (usersSection) {
            const tbody = usersSection.querySelector("tbody");
            if (tbody) {
                tbody.innerHTML = (users || []).map((user, index) => `
                    <tr class="border-b border-gray-800 hover:bg-gray-800 transition">
                        <td class="py-2">${index + 1}</td>
                        <td>${user.name}</td>
                        <td class="${user.role === 'admin' ? 'text-green-400' : 'text-gray-400'}">${user.role || "user"}</td>
                    </tr>
                `).join("");
            }
        }
    } catch (error) {
        console.error("Error loading users:", error);
    }
}

async function loadProjectsTable() {
    try {
        const { data: projects, error } = await supabase
            .from("products")
            .select("id, title, description, main_image, category, level")
            .limit(5);

        if (error) throw error;

        // Find Projects section and update its table
        const sections = document.querySelectorAll(".bg-gray-900.p-6.rounded-2xl");
        const projectsSection = Array.from(sections).find(s => s.textContent.includes("Projects") && !s.textContent.includes("Management"));
        
        if (projectsSection) {
            const tbody = projectsSection.querySelector("tbody");
            if (tbody) {
                tbody.innerHTML = (projects || []).map((project, index) => `
                    <tr class="border-b border-gray-800 hover:bg-gray-800 transition">
                        <td class="py-2">${index + 1}</td>
                        <td>${project.title}</td>
                        <td class="text-blue-400">${project.level || "N/A"}</td>
                    </tr>
                `).join("");
            }
        }
    } catch (error) {
        console.error("Error loading projects table:", error);
    }
}

async function loadServicesTable() {
    try {
        const { data: services, error } = await supabase
            .from("services")
            .select("id, title, description, category, price")
            .limit(5);

        if (error) throw error;

        // Find Services section and update its table
        const sections = document.querySelectorAll(".bg-gray-900.p-6.rounded-2xl");
        const servicesSection = Array.from(sections).find(s => s.textContent.includes("Services"));
        
        if (servicesSection) {
            const tbody = servicesSection.querySelector("tbody");
            if (tbody) {
                tbody.innerHTML = (services || []).map((service, index) => `
                    <tr class="border-b border-gray-800 hover:bg-gray-800 transition">
                        <td class="py-2">${index + 1}</td>
                        <td>${service.title}</td>
                        <td class="text-gray-400">${service.category || "N/A"}</td>
                    </tr>
                `).join("");
            }
        }
    } catch (error) {
        console.error("Error loading services table:", error);
    }
}

async function loadProjectsManagement() {
    try {
        const { data: projects, error } = await supabase
            .from("products")
            .select("id, title, description, main_image, created_at");

        if (error) throw error;

        const projectsList = document.getElementById("projects-list");
        if (!projectsList) return;

        projectsList.innerHTML = (projects || []).map((project) => `
            <div class="group flex flex-col sm:flex-row sm:items-center justify-between 
                        bg-gray-900 p-5 rounded-2xl border border-gray-800 
                        hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-900/20 
                        transition-all duration-300" data-project-id="${project.id}">

                <div class="flex items-center gap-4 flex-1">
                    <img src="${project.main_image || './img/Prod1.png'}" alt="${project.title}" 
                        class="w-16 h-16 rounded-lg object-cover border border-gray-700 
                            group-hover:scale-105 transition shrink-0" onerror="this.src='./img/Prod1.png'">

                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-1">
                            <h3 class="font-semibold text-lg">${project.title}</h3>
                            <span class="px-3 py-1 text-xs rounded-full 
                                        bg-green-600/20 text-green-400">
                                Published
                            </span>
                        </div>

                        <p class="text-gray-400 text-sm">
                            ${project.description || "No description"}
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2 sm:gap-3 mt-4 sm:mt-0">
                    <button class="edit-btn p-2 rounded-lg bg-gray-800 hover:bg-blue-600 transition group">
                        <i class="fas fa-edit text-blue-400 group-hover:text-white"></i>
                    </button>

                    <button class="delete-btn p-2 rounded-lg bg-gray-800 hover:bg-red-600 transition group">
                        <i class="fas fa-trash text-red-400 group-hover:text-white"></i>
                    </button>

                    <button class="hide-btn p-2 rounded-lg bg-gray-800 hover:bg-yellow-600 transition group">
                        <i class="fas fa-eye-slash text-gray-400 group-hover:text-white"></i>
                    </button>
                </div>
            </div>
        `).join("");

        // Reattach event listeners
        attachProjectEventListeners();
    } catch (error) {
        console.error("Error loading projects management:", error);
    }
}

function attachProjectEventListeners() {
    const editModal = document.getElementById("edit-modal");
    const deleteModal = document.getElementById("delete-modal");
    let currentProject = null;

    // Edit
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentProject = btn.closest("[data-project-id]");
            if (!currentProject) return;
            document.getElementById("edit-title").value = currentProject.querySelector("h3")?.textContent || "";
            document.getElementById("edit-desc").value = currentProject.querySelector("p")?.textContent || "";
            editModal?.classList.remove("hidden");
        });
    });

    document.getElementById("edit-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentProject) return;

        const projectId = currentProject.getAttribute("data-project-id");
        const newTitle = document.getElementById("edit-title")?.value.trim() || "";
        const newDesc = document.getElementById("edit-desc")?.value.trim() || "";

        try {
            const { error } = await supabase
                .from("products")
                .update({ title: newTitle, description: newDesc })
                .eq("id", projectId);

            if (error) throw error;

            currentProject.querySelector("h3").textContent = newTitle;
            currentProject.querySelector("p").textContent = newDesc;
            editModal?.classList.add("hidden");
        } catch (error) {
            console.error("Error updating project:", error);
            alert("Failed to update project");
        }
    });

    // Delete
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentProject = btn.closest("[data-project-id]");
            if (currentProject) deleteModal?.classList.remove("hidden");
        });
    });

    document.getElementById("delete-yes")?.addEventListener("click", async () => {
        if (!currentProject) return;

        const projectId = currentProject.getAttribute("data-project-id");
        try {
            const { error } = await supabase
                .from("products")
                .delete()
                .eq("id", projectId);

            if (error) throw error;

            currentProject.remove();
            deleteModal?.classList.add("hidden");
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("Failed to delete project");
        }
    });

    // Close modals
    document.getElementById("edit-close")?.addEventListener("click", () => editModal?.classList.add("hidden"));
    document.getElementById("edit-cancel")?.addEventListener("click", () => editModal?.classList.add("hidden"));
    document.getElementById("delete-close")?.addEventListener("click", () => deleteModal?.classList.add("hidden"));
    document.getElementById("delete-no")?.addEventListener("click", () => deleteModal?.classList.add("hidden"));
}

// ────────────────────────────────────────────────
//  Main Dashboard Init
// ────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    // Sidebar Navigation
    const buttons = document.querySelectorAll("aside button:not(#logoutbtn)");
    const title = document.getElementById("button-name");
    const logoutBtn = document.getElementById("logoutbtn");

    const pageMap = {
        "Main": "main-content",
        "Projects": "projects-content",
        "Services": "services-content",
        "Interactions": "interactions-content",
        "Users": "users-content",
        "Settings": "settings-content"
    };

    // Default active button
    if (buttons.length > 0) {
        const defaultBtn = buttons[0];
        defaultBtn.classList.add("bg-yellow-600", "text-black");
        title.textContent = defaultBtn.textContent.trim();

        Object.values(pageMap).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add("hidden");
        });

        const defaultContent = document.getElementById(pageMap[defaultBtn.textContent.trim()]);
        if (defaultContent) defaultContent.classList.remove("hidden");

        // Load initial data
        loadDashboardStats();
        loadInteractions();
        loadUsersTable();
        loadProjectsTable();
        loadServicesTable();
        loadProjectsManagement();
    }

    // Switch pages
    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            title.textContent = btn.textContent.trim();

            buttons.forEach(b => b.classList.remove("bg-yellow-600", "text-black"));
            btn.classList.add("bg-yellow-600", "text-black");

            Object.values(pageMap).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add("hidden");
            });

            const targetId = pageMap[btn.textContent.trim()];
            const target = document.getElementById(targetId);
            if (target) {
                target.classList.remove("hidden");
                target.classList.add("opacity-0");
                setTimeout(() => target.classList.remove("opacity-0"), 20);
            }

            // Reload data when switching to main
            if (btn.textContent.trim() === "Main") {
                loadDashboardStats();
                loadInteractions();
                loadUsersTable();
                loadProjectsTable();
                loadServicesTable();
            }
        });
    });

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            document.body.classList.add("opacity-0");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 500);
        });
    }

    // Initial project management setup
    attachProjectEventListeners();
});
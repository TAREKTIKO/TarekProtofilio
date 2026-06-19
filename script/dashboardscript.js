import { supabase } from "./supabase.js";

// Wait for DOM to be ready before executing
async function waitForDOM() {
    return new Promise((resolve) => {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", resolve, { once: true });
        } else {
            resolve();
        }
    });
}

// Ensure supabase is ready
async function waitForSupabase() {
    return new Promise((resolve) => {
        let attempts = 0;
        const interval = setInterval(() => {
            if (supabase || attempts > 50) {
                clearInterval(interval);
                resolve();
            }
            attempts++;
        }, 50);
    });
}

console.log("Dashboardscript loaded, supabase:", supabase ? "✓ Available" : "✗ Not available");

// Global state for operations
let projectPendingDelete = null;
let userPendingDelete = null;

const PROJECT_VISIBILITY_STORAGE_KEY = "dashboardProjectVisibility";
let productOptionalColumns = {
    checked: false,
    isVisible: true,
    demoUrl: true
};

function getStoredProjectVisibility() {
    try {
        return JSON.parse(localStorage.getItem(PROJECT_VISIBILITY_STORAGE_KEY) || "{}");
    } catch (error) {
        console.warn("Could not read project visibility cache:", error);
        return {};
    }
}

function setStoredProjectVisibility(projectId, isVisible) {
    const visibility = getStoredProjectVisibility();
    visibility[projectId] = isVisible;
    localStorage.setItem(PROJECT_VISIBILITY_STORAGE_KEY, JSON.stringify(visibility));
}

function removeStoredProjectVisibility(projectId) {
    const visibility = getStoredProjectVisibility();
    delete visibility[projectId];
    localStorage.setItem(PROJECT_VISIBILITY_STORAGE_KEY, JSON.stringify(visibility));
}

function getProjectVisibility(project) {
    const storedVisibility = getStoredProjectVisibility();
    if (Object.prototype.hasOwnProperty.call(storedVisibility, project.id)) {
        return storedVisibility[project.id] !== false;
    }

    return project.is_visible !== false;
}

function isMissingColumnError(error, columnName) {
    if (!error) return false;
    const message = `${error.message || ""} ${error.details || ""} ${error.hint || ""}`;
    return message.includes(columnName) || error.code === "42703" || error.code === "PGRST204";
}

async function getProductOptionalColumns() {
    if (productOptionalColumns.checked) {
        return productOptionalColumns;
    }

    const { error } = await supabase
        .from("products")
        .select("id, is_visible, demo_url")
        .limit(1);

    productOptionalColumns = {
        checked: true,
        isVisible: !isMissingColumnError(error, "is_visible"),
        demoUrl: !isMissingColumnError(error, "demo_url")
    };

    return productOptionalColumns;
}

// ────────────────────────────────────────────────
//  Dashboard Stats & Data Loading
// ────────────────────────────────────────────────

async function loadDashboardStats() {
    try {
        if (!supabase) {
            console.error("Supabase not initialized");
            return;
        }

        console.log("Starting loadDashboardStats...");

        // Fetch counts from database
        const projectsRes = await supabase.from("products").select("id", { count: "exact", head: true });
        const servicesRes = await supabase.from("services").select("id", { count: "exact", head: true });
        const usersRes = await supabase.from("users").select("id", { count: "exact", head: true });
        const commentsRes = await supabase.from("comments").select("id", { count: "exact", head: true });

        console.log("Stats fetched:", { 
            projects: projectsRes.count, 
            services: servicesRes.count, 
            users: usersRes.count, 
            comments: commentsRes.count,
            projectsError: projectsRes.error
        });

        // Update stat cards
        const mainContent = document.getElementById("main-content");
        if (mainContent) {
            const gridDiv = mainContent.querySelector(".grid.grid-cols-1");
            if (gridDiv) {
                const cards = gridDiv.querySelectorAll(".bg-gray-900");
                if (cards[0]) {
                    cards[0].querySelector("span").textContent = projectsRes.count || 0;
                    console.log("Updated projects card to:", projectsRes.count);
                }
                if (cards[1]) cards[1].querySelector("span").textContent = servicesRes.count || 0;
                if (cards[2]) cards[2].querySelector("span").textContent = usersRes.count || 0;
                if (cards[3]) cards[3].querySelector("span").textContent = commentsRes.count || 0;
            }
        }
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

        // Find the interactions table in main-content
        const mainContent = document.getElementById("main-content");
        if (!mainContent) return;
        
        const table = mainContent.querySelector("table");
        const tbody = table?.querySelector("tbody");
        
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

        // Find bottom cards grid and get first card (Users)
        const mainContent = document.getElementById("main-content");
        if (!mainContent) return;
        
        const bottomGrid = mainContent.querySelector(".grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3");
        if (!bottomGrid) return;
        
        const cards = bottomGrid.querySelectorAll(".bg-gray-900");
        if (cards[0]) {
            const tbody = cards[0].querySelector("tbody");
            if (tbody) {
                tbody.innerHTML = (users || []).map((user, index) => `
                    <tr class="hover:bg-gray-800 transition">
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

        // Find bottom cards grid and get second card (Projects)
        const mainContent = document.getElementById("main-content");
        if (!mainContent) return;
        
        const bottomGrid = mainContent.querySelector(".grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3");
        if (!bottomGrid) return;
        
        const cards = bottomGrid.querySelectorAll(".bg-gray-900");
        if (cards[1]) {
            const tbody = cards[1].querySelector("tbody");
            if (tbody) {
                tbody.innerHTML = (projects || []).map((project, index) => `
                    <tr class="hover:bg-gray-800 transition">
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

        // Find bottom cards grid and get third card (Services)
        const mainContent = document.getElementById("main-content");
        if (!mainContent) return;
        
        const bottomGrid = mainContent.querySelector(".grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3");
        if (!bottomGrid) return;
        
        const cards = bottomGrid.querySelectorAll(".bg-gray-900");
        if (cards[2]) {
            const tbody = cards[2].querySelector("tbody");
            if (tbody) {
                tbody.innerHTML = (services || []).map((service, index) => `
                    <tr class="hover:bg-gray-800 transition">
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

// ────────────────────────────────────────────────
//  Projects Management (CRUD + Visibility)
// ────────────────────────────────────────────────

async function loadProjectsManagement() {
    try {
        const optionalColumns = await getProductOptionalColumns();
        const selectColumns = [
            "id",
            "title",
            "description",
            "main_image",
            "created_at",
            optionalColumns.isVisible ? "is_visible" : null
        ].filter(Boolean).join(", ");

        const { data: projects, error } = await supabase
            .from("products")
            .select(selectColumns)
            .order("created_at", { ascending: false });

        if (error) throw error;

        const projectsList = document.getElementById("projects-list");
        if (!projectsList) return;

        projectsList.innerHTML = (projects || []).map((project) => {
            const isVisible = getProjectVisibility(project);
            return `
            <div class="group flex flex-col sm:flex-row sm:items-center justify-between 
                        bg-gray-900 p-5 rounded-2xl border border-gray-800 
                        hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-900/20 
                        transition-all duration-300 ${isVisible ? '' : 'opacity-60'}" data-project-id="${project.id}">

                <div class="flex items-center gap-4 flex-1">
                    <img src="${project.main_image || './img/Prod1.png'}" alt="${project.title}" 
                        class="w-16 h-16 rounded-lg object-cover border border-gray-700 
                            group-hover:scale-105 transition shrink-0" onerror="this.src='./img/Prod1.png'">

                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-1">
                            <h3 class="font-semibold text-lg">${project.title}</h3>
                            <span class="px-3 py-1 text-xs rounded-full 
                                        ${isVisible ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'}">
                                ${isVisible ? 'Published' : 'Hidden'}
                            </span>
                        </div>

                        <p class="text-gray-400 text-sm">
                            ${project.description || "No description"}
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2 sm:gap-3 mt-4 sm:mt-0">
                    <button class="edit-btn p-2 rounded-lg bg-gray-800 hover:bg-blue-600 transition group" title="Edit Project">
                        <i class="fas fa-edit text-blue-400 group-hover:text-white"></i>
                    </button>

                    <button class="delete-btn p-2 rounded-lg bg-gray-800 hover:bg-red-600 transition group" title="Delete Project">
                        <i class="fas fa-trash text-red-400 group-hover:text-white"></i>
                    </button>

                    <button class="hide-btn p-2 rounded-lg bg-gray-800 hover:bg-yellow-600 transition group" title="${isVisible ? 'Hide Project' : 'Show Project'}">
                        <i class="fas ${isVisible ? 'fa-eye-slash' : 'fa-eye'} ${isVisible ? 'text-gray-400' : 'text-yellow-400'} group-hover:text-white"></i>
                    </button>
                </div>
            </div>
        `;
        }).join("");

        // Reattach/ensure event delegation listener is present
        attachProjectEventListeners();
    } catch (error) {
        console.error("Error loading projects management:", error);
    }
}

// Event Delegation for dynamic project list buttons
function attachProjectEventListeners() {
    const projectsList = document.getElementById("projects-list");
    if (!projectsList) return;

    // Use dataset flag to prevent duplicate listeners on multiple re-loads
    if (projectsList.dataset.listenerAttached === "true") return;
    projectsList.dataset.listenerAttached = "true";

    projectsList.addEventListener("click", async (e) => {
        const target = e.target;
        const editBtn = target.closest(".edit-btn");
        const deleteBtn = target.closest(".delete-btn");
        const hideBtn = target.closest(".hide-btn");

        if (!editBtn && !deleteBtn && !hideBtn) return;

        const projectCard = target.closest("[data-project-id]");
        if (!projectCard) return;

        const projectId = projectCard.getAttribute("data-project-id");

        if (editBtn) {
            try {
                const { data: project, error } = await supabase
                    .from("products")
                    .select("*")
                    .eq("id", projectId)
                    .single();

                if (error) throw error;

                // Open the modal in edit mode
                await openAddModal(project);
            } catch (err) {
                console.error("Error loading project for edit:", err);
                alert("Failed to load project for editing");
            }
        } 
        
        else if (deleteBtn) {
            projectPendingDelete = projectCard;
            const deleteModal = document.getElementById("delete-modal");
            deleteModal?.classList.remove("hidden");
        } 
        
        else if (hideBtn) {
            const isCurrentlyVisible = !projectCard.classList.contains("opacity-60");
            const newVisibility = !isCurrentlyVisible;

            try {
                const optionalColumns = await getProductOptionalColumns();
                if (optionalColumns.isVisible) {
                    const { error } = await supabase
                        .from("products")
                        .update({ is_visible: newVisibility })
                        .eq("id", projectId);

                    if (error) throw error;
                }

                setStoredProjectVisibility(projectId, newVisibility);

                alert(`Project has been ${newVisibility ? "published" : "hidden"} successfully!`);
                await loadProjectsManagement();
            } catch (error) {
                console.error("Error toggling visibility:", error);
                alert("Failed to update visibility: " + (error.message || JSON.stringify(error)));
            }
        }
    });
}

// Setup global modal buttons (OK, Cancel) once
function setupGlobalModalListeners() {
    const deleteModal = document.getElementById("delete-modal");
    const deleteYesBtn = document.getElementById("delete-yes");
    const deleteNoBtn = document.getElementById("delete-no");

    if (deleteYesBtn) {
        const newDeleteYes = deleteYesBtn.cloneNode(true);
        deleteYesBtn.parentNode.replaceChild(newDeleteYes, deleteYesBtn);
        newDeleteYes.addEventListener("click", async () => {
            if (!projectPendingDelete) return;

            const projectId = projectPendingDelete.getAttribute("data-project-id");
            try {
                // Delete dependent rows first to satisfy foreign key constraints.
                const childDeletes = [
                    await supabase.from("project_media").delete().eq("product_id", projectId),
                    await supabase.from("likes").delete().eq("product_id", projectId),
                    await supabase.from("comments").delete().eq("product_id", projectId)
                ];

                const childDeleteError = childDeletes.find(result => result.error)?.error;
                if (childDeleteError) throw childDeleteError;

                const { error } = await supabase
                    .from("products")
                    .delete()
                    .eq("id", projectId);

                if (error) throw error;

                removeStoredProjectVisibility(projectId);
                projectPendingDelete.remove();
                projectPendingDelete = null;
                deleteModal?.classList.add("hidden");
                
                await loadDashboardStats();
                await loadProjectsTable();
            } catch (error) {
                console.error("Error deleting project:", error);
                alert("Failed to delete project: " + (error.message || JSON.stringify(error)));
            }
        });
    }

    if (deleteNoBtn) {
        const newDeleteNo = deleteNoBtn.cloneNode(true);
        deleteNoBtn.parentNode.replaceChild(newDeleteNo, deleteNoBtn);
        newDeleteNo.addEventListener("click", () => {
            projectPendingDelete = null;
            deleteModal?.classList.add("hidden");
        });
    }
}

// Global helper to open the Add Project modal for create or edit
async function openAddModal(project = null) {
    const modal = document.getElementById("add-project-modal");
    const form = document.getElementById("add-project-form");
    const imageInput = document.getElementById("add-main-image");
    const modalTitle = modal?.querySelector("h3");

    form?.reset();
    if (modal) {
        delete modal.dataset.editId;
    }
    if (imageInput) imageInput.value = "";

    const demoInput = document.getElementById("add-demo-url");
    const previewImagesTextarea = document.getElementById("add-preview-images");
    if (demoInput) demoInput.value = "";
    if (previewImagesTextarea) previewImagesTextarea.value = "";

    if (project) {
        // Edit mode pre-fills
        if (modal) {
            modal.dataset.editId = project.id;
        }
        if (modalTitle) {
            modalTitle.textContent = "Edit Project Details";
        }
        
        document.getElementById("add-title").value = project.title || "";
        document.getElementById("add-description").value = project.description || "";
        document.getElementById("add-category").value = project.category || "";
        document.getElementById("add-level").value = project.level || "";
        document.getElementById("add-duration").value = project.duration || "";
        document.getElementById("add-main-image").value = project.main_image || "";
        document.getElementById("add-video-url").value = project.video_url || "";
        if (demoInput) demoInput.value = project.demo_url || "";

        // Fetch additional images from project_media
        if (previewImagesTextarea) {
            previewImagesTextarea.placeholder = "Loading preview images...";
            try {
                const { data: media, error } = await supabase
                    .from("project_media")
                    .select("media_url")
                    .eq("product_id", project.id);

                if (error) throw error;

                if (media && media.length > 0) {
                    previewImagesTextarea.value = media.map(m => m.media_url).join(", ");
                } else {
                    previewImagesTextarea.value = "";
                }
            } catch (err) {
                console.error("Error loading preview images:", err);
                previewImagesTextarea.value = "";
            } finally {
                previewImagesTextarea.placeholder = "https://example.com/img1.jpg, https://example.com/img2.jpg";
            }
        }
    } else {
        // Create mode pre-fills
        if (modalTitle) {
            modalTitle.textContent = "Add New Project";
        }
    }

    modal?.classList.remove("hidden");
}

function setupAddProjectModal() {
    const modal = document.getElementById("add-project-modal");
    const openBtn = document.getElementById("add-project-btn");
    const closeBtn = document.getElementById("add-cancel");
    const form = document.getElementById("add-project-form");
    const uploadBtn = document.getElementById("upload-btn");
    const imageUpload = document.getElementById("add-image-upload");
    const imageInput = document.getElementById("add-main-image");

    openBtn?.addEventListener("click", () => {
        openAddModal(null);
    });

    closeBtn?.addEventListener("click", () => {
        modal?.classList.add("hidden");
    });

    uploadBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        imageUpload?.click();
    });

    imageUpload?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const fileName = `project-${Date.now()}-${file.name}`;
            const { data, error } = await supabase.storage
                .from("project_images")
                .upload(fileName, file);

            if (error) throw error;

            const { data: publicUrl } = supabase.storage
                .from("project_images")
                .getPublicUrl(fileName);

            if (imageInput) {
                imageInput.value = publicUrl.publicUrl;
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Failed to upload image");
        }
    });

    form?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("add-title")?.value.trim();
        const description = document.getElementById("add-description")?.value.trim();
        const category = document.getElementById("add-category")?.value.trim();
        const level = document.getElementById("add-level")?.value;
        const duration = document.getElementById("add-duration")?.value.trim();
        const mainImage = document.getElementById("add-main-image")?.value.trim();
        const videoUrl = document.getElementById("add-video-url")?.value.trim() || null;
        const demoUrl = document.getElementById("add-demo-url")?.value.trim() || null;
        const previewImagesRaw = document.getElementById("add-preview-images")?.value.trim() || "";

        if (!title || !description || !category || !level || !duration || !mainImage) {
            alert("Please fill all required fields");
            return;
        }

        const editId = modal?.dataset.editId;

        try {
            let projectId = editId;
            const optionalColumns = await getProductOptionalColumns();
            const projectPayload = {
                title,
                description,
                category,
                level,
                duration,
                main_image: mainImage,
                video_url: videoUrl
            };

            if (optionalColumns.demoUrl) {
                projectPayload.demo_url = demoUrl;
            }

            if (editId) {
                const { data, error } = await supabase
                    .from("products")
                    .update(projectPayload)
                    .eq("id", editId)
                    .select();

                if (error) throw error;

                alert("Project updated successfully!");
            } else {
                projectPayload.likes = 0;
                if (optionalColumns.isVisible) {
                    projectPayload.is_visible = true;
                }

                const { data, error } = await supabase
                    .from("products")
                    .insert([projectPayload])
                    .select();

                if (error) throw error;
                if (data && data.length > 0) {
                    projectId = data[0].id;
                    setStoredProjectVisibility(projectId, true);
                }

                alert("Project created successfully!");
            }

            // Sync additional preview images into project_media
            if (projectId) {
                // Delete old media mapping
                await supabase
                    .from("project_media")
                    .delete()
                    .eq("product_id", projectId);

                // Insert new media mapping
                const mediaUrls = previewImagesRaw
                    .split(",")
                    .map(url => url.trim())
                    .filter(url => url.length > 0);

                if (mediaUrls.length > 0) {
                    const mediaRows = mediaUrls.map(url => ({
                        product_id: projectId,
                        media_url: url,
                        media_type: "image"
                    }));

                    const { error: insertMediaError } = await supabase
                        .from("project_media")
                        .insert(mediaRows);

                    if (insertMediaError) throw insertMediaError;
                }
            }

            modal?.classList.add("hidden");
            form?.reset();
            if (imageInput) imageInput.value = "";

            await loadProjectsManagement();
            await loadProjectsTable();
            await loadDashboardStats();
        } catch (error) {
            console.error("Error saving project:", error);
            alert("Failed to save project: " + (error.message || JSON.stringify(error)));
        }
    });

    modal?.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
        }
    });
}

// ────────────────────────────────────────────────
//  Interactions Page (Comments + Messages)
// ────────────────────────────────────────────────

async function loadFullInteractions() {
    try {
        const tbody = document.getElementById("interactions-tbody");
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-4 text-gray-400">Loading interactions...</td>
            </tr>
        `;

        // Fetch comments and messages in parallel
        const [commentsRes, messagesRes] = await Promise.all([
            supabase
                .from("comments")
                .select("id, comment_text, created_at, is_seen, users(name)")
                .order("created_at", { ascending: false }),
            supabase
                .from("contact_messages")
                .select("id, name, message, created_at, phone, is_seen")
                .order("created_at", { ascending: false })
        ]);

        if (commentsRes.error) throw commentsRes.error;
        if (messagesRes.error) throw messagesRes.error;

        const comments = commentsRes.data || [];
        const messages = messagesRes.data || [];

        let allInteractions = [];

        comments.forEach(c => {
            allInteractions.push({
                id: c.id,
                sender: c.users?.name || "Anonymous User",
                details: c.comment_text,
                created_at: c.created_at,
                type: "Comment",
                is_seen: c.is_seen === true
            });
        });

        messages.forEach(m => {
            allInteractions.push({
                id: m.id,
                sender: `${m.name}${m.phone ? ` (${m.phone})` : ''}`,
                details: m.message,
                created_at: m.created_at,
                type: "Message",
                is_seen: m.is_seen === true
            });
        });

        // Sort chronologically descending
        allInteractions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (allInteractions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-4 text-gray-400">No comments or messages found.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = allInteractions.map((item, index) => {
            const dateStr = new Date(item.created_at).toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            }).replace(",", " |");

            const isComment = item.type === "Comment";
            const badgeClass = isComment 
                ? "bg-blue-600/20 text-blue-400" 
                : "bg-green-600/20 text-green-400";
                
            const rowClass = item.is_seen 
                ? "border-b border-gray-800 hover:bg-gray-800/50 opacity-70 transition duration-200" 
                : "border-b border-gray-800 hover:bg-gray-800/80 bg-yellow-500/[0.02] font-semibold transition duration-200";

            return `
                <tr class="${rowClass}" data-interaction-id="${item.id}" data-interaction-type="${item.type}" data-is-seen="${item.is_seen}">
                    <td class="py-4 font-normal text-gray-500">${index + 1}</td>
                    <td class="font-medium text-white">${item.sender}</td>
                    <td class="text-left px-4 max-w-md truncate text-gray-300 font-normal" title="${item.details}">${item.details}</td>
                    <td class="text-gray-400 text-sm">${dateStr}</td>
                    <td>
                        <span class="px-3 py-1 rounded-full text-xs font-medium ${badgeClass}">
                            ${item.type}
                        </span>
                    </td>
                    <td>
                        <div class="flex justify-center gap-2">
                            <button class="seen-btn p-2 rounded-lg bg-gray-800 hover:bg-yellow-600 transition group" title="${item.is_seen ? 'Mark Unread (Need to read)' : 'Mark Read (Already read)'}">
                                <i class="fas ${item.is_seen ? 'fa-eye-slash text-gray-400' : 'fa-eye text-yellow-400'} group-hover:text-white"></i>
                            </button>
                            <button class="delete-interaction-btn p-2 rounded-lg bg-gray-800 hover:bg-red-600 transition group" title="Delete Interaction">
                                <i class="fas fa-trash text-red-400 group-hover:text-white"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        attachInteractionsEventListeners();
    } catch (error) {
        console.error("Error loading full interactions:", error);
        const tbody = document.getElementById("interactions-tbody");
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-4 text-red-400">Failed to load interactions: ${error.message || JSON.stringify(error)}</td>
                </tr>
            `;
        }
    }
}

// Event Delegation for Interactions list
function attachInteractionsEventListeners() {
    const tbody = document.getElementById("interactions-tbody");
    if (!tbody) return;

    if (tbody.dataset.listenerAttached === "true") return;
    tbody.dataset.listenerAttached = "true";

    tbody.addEventListener("click", async (e) => {
        const target = e.target;
        const seenBtn = target.closest(".seen-btn");
        const deleteBtn = target.closest(".delete-interaction-btn");

        if (!seenBtn && !deleteBtn) return;

        const row = target.closest("[data-interaction-id]");
        if (!row) return;

        const id = row.getAttribute("data-interaction-id");
        const type = row.getAttribute("data-interaction-type");

        if (seenBtn) {
            const isSeen = row.getAttribute("data-is-seen") === "true";
            const newSeenStatus = !isSeen;

            try {
                const table = type === "Comment" ? "comments" : "contact_messages";
                const { error } = await supabase
                    .from(table)
                    .update({ is_seen: newSeenStatus })
                    .eq("id", id);

                if (error) throw error;

                // Reload full interactions list
                await loadFullInteractions();
            } catch (error) {
                console.error("Error updating seen state:", error);
                alert("Failed to update status: " + (error.message || JSON.stringify(error)));
            }
        } 
        
        else if (deleteBtn) {
            if (!confirm("هل أنت متأكد من حذف هذا التفاعل؟ العملية لا يمكن التراجع عنها.")) return;

            try {
                if (type === "Comment") {
                    // Delete Replies and Likes first to satisfy foreign key constraints
                    await supabase.from("replies").delete().eq("comment_id", id);
                    await supabase.from("likes").delete().eq("comment_id", id);
                    
                    const { error } = await supabase
                        .from("comments")
                        .delete()
                        .eq("id", id);

                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from("contact_messages")
                        .delete()
                        .eq("id", id);

                    if (error) throw error;
                }

                row.remove();
                await loadDashboardStats();
                await loadInteractions();
            } catch (error) {
                console.error("Error deleting interaction:", error);
                alert("Failed to delete interaction: " + (error.message || JSON.stringify(error)));
            }
        }
    });
}

// ────────────────────────────────────────────────
//  Users Management Page (CRUD)
// ────────────────────────────────────────────────

async function loadUsersPage() {
    try {
        const tbody = document.getElementById("users-tbody");
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-4 text-gray-400">Loading users...</td>
            </tr>
        `;

        const { data: users, error } = await supabase
            .from("users")
            .select("id, name, email, role, avatar, gender, password")
            .order("created_at", { ascending: false });

        if (error) throw error;

        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-4 text-gray-400">No users found.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = (users || []).map((user, index) => {
            const roleBadge = user.role === "admin" 
                ? "bg-green-600/20 text-green-400" 
                : "bg-yellow-600/20 text-yellow-400";

            return `
                <tr class="border-b border-gray-800 hover:bg-gray-800 transition" data-user-id="${user.id}">
                    <td class="py-3 font-normal text-gray-500">${index + 1}</td>
                    <td class="font-medium text-white">${user.name}</td>
                    <td class="text-gray-400">${user.email}</td>
                    <td>
                        <span class="px-3 py-1 rounded-full text-xs font-medium ${roleBadge}">
                            ${user.role || "user"}
                        </span>
                    </td>
                    <td>
                        <div class="flex justify-center gap-3">
                            <button class="user-edit-btn text-blue-400 hover:text-blue-300 transition" title="Edit User">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="user-delete-btn text-red-400 hover:text-red-300 transition" title="Delete User">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        attachUsersEventListeners();
    } catch (error) {
        console.error("Error loading users:", error);
        const tbody = document.getElementById("users-tbody");
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-4 text-red-400">Failed to load users: ${error.message || JSON.stringify(error)}</td>
                </tr>
            `;
        }
    }
}

// Event Delegation for Users Table
function attachUsersEventListeners() {
    const tbody = document.getElementById("users-tbody");
    if (!tbody) return;

    if (tbody.dataset.listenerAttached === "true") return;
    tbody.dataset.listenerAttached = "true";

    tbody.addEventListener("click", async (e) => {
        const target = e.target;
        const editBtn = target.closest(".user-edit-btn");
        const deleteBtn = target.closest(".user-delete-btn");

        if (!editBtn && !deleteBtn) return;

        const row = target.closest("[data-user-id]");
        if (!row) return;

        const userId = row.getAttribute("data-user-id");

        if (editBtn) {
            try {
                const { data: user, error } = await supabase
                    .from("users")
                    .select("*")
                    .eq("id", userId)
                    .single();

                if (error) throw error;

                // Open Modal in Edit Mode
                openUserModal(user);
            } catch (err) {
                console.error("Error loading user details:", err);
                alert("Failed to load user information");
            }
        } 
        
        else if (deleteBtn) {
            if (!confirm("هل أنت متأكد من حذف هذا المستخدم نهائياً؟ العملية ستقوم بحذف جميع تعليقاته وتفاعلاته.")) return;

            try {
                // Delete user dependent comments, likes, replies first
                await supabase.from("replies").delete().eq("user_id", userId);
                await supabase.from("likes").delete().eq("user_id", userId);
                await supabase.from("comments").delete().eq("user_id", userId);

                const { error } = await supabase
                    .from("users")
                    .delete()
                    .eq("id", userId);

                if (error) throw error;

                row.remove();
                await loadDashboardStats();
                await loadUsersTable();
            } catch (err) {
                console.error("Error deleting user:", err);
                alert("Failed to delete user: " + (err.message || JSON.stringify(err)));
            }
        }
    });
}

// Open User modal for Add or Edit
function openUserModal(user = null) {
    const modal = document.getElementById("user-modal");
    const form = document.getElementById("user-form");
    const modalTitle = document.getElementById("user-modal-title");

    form?.reset();
    if (modal) {
        delete modal.dataset.editId;
    }

    if (user) {
        // Edit mode pre-fills
        if (modal) {
            modal.dataset.editId = user.id;
        }
        if (modalTitle) {
            modalTitle.textContent = "Edit User Details";
        }

        document.getElementById("user-name-input").value = user.name || "";
        document.getElementById("user-email-input").value = user.email || "";
        document.getElementById("user-password-input").value = user.password || "";
        document.getElementById("user-role-input").value = user.role || "user";
        document.getElementById("user-gender-input").value = user.gender || "";
        document.getElementById("user-avatar-input").value = user.avatar || "";
    } else {
        // Add mode pre-fills
        if (modalTitle) {
            modalTitle.textContent = "Add New User";
        }
    }

    modal?.classList.remove("hidden");
}

function setupUserModal() {
    const modal = document.getElementById("user-modal");
    const openBtn = document.getElementById("add-user-btn");
    const closeBtn = document.getElementById("user-cancel");
    const form = document.getElementById("user-form");

    openBtn?.addEventListener("click", () => {
        openUserModal(null);
    });

    closeBtn?.addEventListener("click", () => {
        modal?.classList.add("hidden");
    });

    form?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("user-name-input")?.value.trim();
        const email = document.getElementById("user-email-input")?.value.trim();
        const password = document.getElementById("user-password-input")?.value;
        const role = document.getElementById("user-role-input")?.value;
        const gender = document.getElementById("user-gender-input")?.value || null;
        const avatar = document.getElementById("user-avatar-input")?.value.trim() || `./img/Avatar1.png`;

        if (!name || !email || !password || !role) {
            alert("Please fill all required fields");
            return;
        }

        const editId = modal?.dataset.editId;

        try {
            if (editId) {
                // Update User
                const { error } = await supabase
                    .from("users")
                    .update({ name, email, password, role, gender, avatar })
                    .eq("id", editId);

                if (error) throw error;
                alert("User details updated successfully!");
            } else {
                // Create User
                const { error } = await supabase
                    .from("users")
                    .insert([{ name, email, password, role, gender, avatar }]);

                if (error) throw error;
                alert("New user created successfully!");
            }

            modal?.classList.add("hidden");
            form?.reset();
            await loadUsersPage();
            await loadUsersTable();
            await loadDashboardStats();
        } catch (err) {
            console.error("Error saving user:", err);
            alert("Failed to save user: " + (err.message || JSON.stringify(err)));
        }
    });

    modal?.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
        }
    });
}

// ────────────────────────────────────────────────
//  Initialize Dashboard
// ────────────────────────────────────────────────

function initializeDashboard() {
    console.log("Dashboard loading...");

    // Exclude settings button and logout button from navigation buttons
    const buttons = document.querySelectorAll("aside .flex.flex-col.gap-2.my-8 button:not(#settings-dropdown-btn)");
    const title = document.getElementById("button-name");
    const logoutBtn = document.getElementById("logoutbtn");

    const pageMap = {
        "Main": "main-content",
        "Projects": "projects-content",
        "Services": "services-content",
        "Interactions": "interactions-content",
        "Users": "users-content",
        "Library": "library-content"
    };

    console.log(`Found ${buttons.length} navigation buttons`);

    if (buttons.length > 0) {
        const defaultBtn = buttons[0];
        defaultBtn.classList.add("bg-yellow-600", "font-medium");
        defaultBtn.style.color = 'black';
        title.textContent = 'Dashboard';

        // Hide all content sections
        Object.values(pageMap).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add("hidden");
        });

        // Show main content by default
        const mainContent = document.getElementById("main-content");
        if (mainContent) mainContent.classList.remove("hidden");

        console.log("Loading dashboard data...");
        loadDashboardStats();
        loadInteractions();
        loadUsersTable();
        loadProjectsTable();
        loadServicesTable();
        loadProjectsManagement();
        loadFullInteractions();
        loadUsersPage();
    }

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const btnName = btn.textContent.trim();
            title.textContent = btnName;

            buttons.forEach(b => {
                b.classList.remove("bg-yellow-600", "font-medium");
                b.style.color = 'white';
            });
            btn.classList.add("bg-yellow-600", "font-medium");
            btn.style.color = 'black';

            Object.values(pageMap).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add("hidden");
            });

            const targetId = pageMap[btnName];
            const target = document.getElementById(targetId);
            if (target) {
                target.classList.remove("hidden");
                target.classList.add("opacity-0");
                setTimeout(() => target.classList.remove("opacity-0"), 20);
            }

            if (btnName === "Main") {
                loadDashboardStats();
                loadInteractions();
                loadUsersTable();
                loadProjectsTable();
                loadServicesTable();
            } else if (btnName === "Interactions") {
                loadFullInteractions();
            } else if (btnName === "Users") {
                loadUsersPage();
            } else if (btnName === "Library") {
                // Future: Add loadLibraryManagement() if needed here
            }
        });
    });

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            // Clear admin session
            localStorage.removeItem("adminAuthenticated");
            localStorage.removeItem("userId");
            localStorage.removeItem("username");
            localStorage.removeItem("userEmail");
            localStorage.removeItem("userRole");
            localStorage.removeItem("avatar");

            document.body.classList.add("opacity-0");
            setTimeout(() => {
                window.location.replace("admin-login.html");
            }, 400);
        });
    }

    setupGlobalModalListeners();
    attachProjectEventListeners();
    setupAddProjectModal();
    setupUserModal();

    console.log("Dashboard ready!");
}

// Call initialization based on document readiness
(async () => {
    await waitForDOM();
    await waitForSupabase();
    initializeDashboard();
})();

// ────────────────────────────────────────────────
//  Library Sub-Tab Logic
// ────────────────────────────────────────────────
function initLibraryTabs() {
    const tabs = document.querySelectorAll(".lib-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            // Remove active classes
            tabs.forEach(t => {
                t.classList.remove("active-lib-tab", "border-yellow-500", "text-yellow-500", "border-b-2");
                t.classList.add("text-gray-400", "border-transparent", "border-b-2");
            });
            // Add to clicked
            tab.classList.add("active-lib-tab", "border-yellow-500", "text-yellow-500", "border-b-2");
            tab.classList.remove("text-gray-400", "border-transparent");

            // Hide all contents
            document.getElementById("lib-tab-items")?.classList.add("hidden");
            document.getElementById("lib-tab-categories")?.classList.add("hidden");
            document.getElementById("lib-tab-subcategories")?.classList.add("hidden");

            // Show target
            const target = tab.dataset.libTab;
            if (target) {
                const el = document.getElementById(`lib-tab-${target}`);
                if (el) el.classList.remove("hidden");
            }
        });
    });
}
document.addEventListener("DOMContentLoaded", () => {
    initLibraryTabs();
});

import { supabase } from "./supabase.js";

// ==========================================
// UTILITIES
// ==========================================
function escapeHtml(str = "") {
    if (!str) return "";
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
}

function showMessage(elId, msg, isError = false) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.className = `text-sm mt-2 block ${isError ? 'text-red-500' : 'text-green-500'}`;
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 3000);
}

// ==========================================
// CATEGORIES
// ==========================================
async function loadLibraryCategories() {
    const list = document.getElementById("lib-categories-list");
    const subcatParent = document.getElementById("lib-subcat-parent");
    if (!list || !subcatParent) return;

    try {
        const { data, error } = await supabase
            .from("library_categories")
            .select("*")
            .order("sort_order", { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = `<p class="text-gray-500 text-sm">No categories found.</p>`;
            subcatParent.innerHTML = `<option value="">No categories available...</option>`;
            return;
        }

        list.innerHTML = data.map(cat => `
            <div class="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700">
                <div class="flex items-center gap-3">
                    <i class="${escapeHtml(cat.icon)} text-amber-500 w-5 text-center"></i>
                    <span class="text-white font-medium">${escapeHtml(cat.name)}</span>
                </div>
                <div class="flex gap-3">
                    <button class="edit-cat-btn text-blue-400 hover:text-blue-300 transition" 
                        data-id="${cat.id}" data-name="${escapeHtml(cat.name)}" data-icon="${escapeHtml(cat.icon)}" data-order="${cat.sort_order}">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="delete-cat-btn text-red-500 hover:text-red-400 transition" data-id="${cat.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join("");

        subcatParent.innerHTML = `<option value="">Select category...</option>` + 
            data.map(cat => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join("");

        // Edit listeners
        list.querySelectorAll(".edit-cat-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.getElementById("lib-cat-name").value = btn.dataset.name;
                document.getElementById("lib-cat-icon").value = btn.dataset.icon;
                document.getElementById("lib-cat-order").value = btn.dataset.order;
                
                const form = document.getElementById("lib-add-cat-form");
                form.dataset.editId = btn.dataset.id;
                
                document.getElementById("lib-cat-submit-btn").textContent = "Update Category";
                document.getElementById("lib-cat-cancel-btn").classList.remove("hidden");
                document.getElementById("lib-cat-name").focus();
            });
        });

        // Delete listeners
        list.querySelectorAll(".delete-cat-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                if (!confirm("Delete this category? Associated subcategories must be deleted first.")) return;
                try {
                    const { error } = await supabase.from("library_categories").delete().eq("id", btn.dataset.id);
                    if (error) throw error;
                    loadLibraryCategories();
                } catch (err) {
                    alert("Error deleting category: " + err.message);
                }
            });
        });

    } catch (err) {
        list.innerHTML = `<p class="text-red-500 text-sm">Error loading categories.</p>`;
    }
}

document.getElementById("lib-cat-cancel-btn")?.addEventListener("click", () => {
    const form = document.getElementById("lib-add-cat-form");
    form.reset();
    delete form.dataset.editId;
    document.getElementById("lib-cat-submit-btn").textContent = "Add Category";
    document.getElementById("lib-cat-cancel-btn").classList.add("hidden");
});

document.getElementById("lib-add-cat-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = document.getElementById("lib-cat-name").value.trim();
    const icon = document.getElementById("lib-cat-icon").value.trim();
    const sort_order = parseInt(document.getElementById("lib-cat-order").value) || 0;
    const editId = form.dataset.editId;

    try {
        if (editId) {
            const { error } = await supabase.from("library_categories").update({ name, icon, sort_order }).eq("id", editId);
            if (error) throw error;
            showMessage("lib-cat-msg", "Category updated successfully!");
        } else {
            const { error } = await supabase.from("library_categories").insert([{ name, icon, sort_order }]);
            if (error) throw error;
            showMessage("lib-cat-msg", "Category added successfully!");
        }
        
        document.getElementById("lib-cat-cancel-btn")?.click(); // reset form
        loadLibraryCategories();
    } catch (err) {
        showMessage("lib-cat-msg", err.message, true);
    }
});


// ==========================================
// SUBCATEGORIES
// ==========================================
async function loadLibrarySubcategories() {
    const list = document.getElementById("lib-subcategories-list");
    const itemSubcat = document.getElementById("lib-item-subcat");
    if (!list || !itemSubcat) return;

    try {
        const { data, error } = await supabase
            .from("library_subcategories")
            .select("*, library_categories(name)")
            .order("sort_order", { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = `<p class="text-gray-500 text-sm">No subcategories found.</p>`;
            itemSubcat.innerHTML = `<option value="">No subcategories available...</option>`;
            return;
        }

        list.innerHTML = data.map(sub => `
            <div class="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700">
                <div class="flex flex-col">
                    <span class="text-white font-medium">${escapeHtml(sub.name)}</span>
                    <span class="text-xs text-amber-500">${escapeHtml(sub.library_categories?.name || "Unknown")}</span>
                </div>
                <div class="flex gap-3">
                    <button class="edit-subcat-btn text-blue-400 hover:text-blue-300 transition" 
                        data-id="${sub.id}" data-parent="${sub.category_id}" data-name="${escapeHtml(sub.name)}" data-order="${sub.sort_order}">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="delete-subcat-btn text-red-500 hover:text-red-400 transition" data-id="${sub.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join("");

        itemSubcat.innerHTML = `<option value="">Select Subcategory...</option>` + 
            data.map(sub => `<option value="${sub.id}">${escapeHtml(sub.library_categories?.name)} -> ${escapeHtml(sub.name)}</option>`).join("");

        // Edit listeners
        list.querySelectorAll(".edit-subcat-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.getElementById("lib-subcat-parent").value = btn.dataset.parent;
                document.getElementById("lib-subcat-name").value = btn.dataset.name;
                document.getElementById("lib-subcat-order").value = btn.dataset.order;
                
                const form = document.getElementById("lib-add-subcat-form");
                form.dataset.editId = btn.dataset.id;
                
                document.getElementById("lib-subcat-submit-btn").textContent = "Update Subcategory";
                document.getElementById("lib-subcat-cancel-btn").classList.remove("hidden");
                document.getElementById("lib-subcat-name").focus();
            });
        });

        // Delete listeners
        list.querySelectorAll(".delete-subcat-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                if (!confirm("Delete this subcategory? Associated items must be deleted first.")) return;
                try {
                    const { error } = await supabase.from("library_subcategories").delete().eq("id", btn.dataset.id);
                    if (error) throw error;
                    loadLibrarySubcategories();
                } catch (err) {
                    alert("Error deleting subcategory: " + err.message);
                }
            });
        });

    } catch (err) {
        list.innerHTML = `<p class="text-red-500 text-sm">Error loading subcategories.</p>`;
    }
}

document.getElementById("lib-subcat-cancel-btn")?.addEventListener("click", () => {
    const form = document.getElementById("lib-add-subcat-form");
    form.reset();
    delete form.dataset.editId;
    document.getElementById("lib-subcat-submit-btn").textContent = "Add Subcategory";
    document.getElementById("lib-subcat-cancel-btn").classList.add("hidden");
});

document.getElementById("lib-add-subcat-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const category_id = document.getElementById("lib-subcat-parent").value;
    const name = document.getElementById("lib-subcat-name").value.trim();
    const sort_order = parseInt(document.getElementById("lib-subcat-order").value) || 0;
    const editId = form.dataset.editId;

    if (!category_id) return showMessage("lib-subcat-msg", "Select a parent category", true);

    try {
        if (editId) {
            const { error } = await supabase.from("library_subcategories").update({ category_id, name, sort_order }).eq("id", editId);
            if (error) throw error;
            showMessage("lib-subcat-msg", "Subcategory updated successfully!");
        } else {
            const { error } = await supabase.from("library_subcategories").insert([{ category_id, name, sort_order }]);
            if (error) throw error;
            showMessage("lib-subcat-msg", "Subcategory added successfully!");
        }
        
        document.getElementById("lib-subcat-cancel-btn")?.click();
        loadLibrarySubcategories();
    } catch (err) {
        showMessage("lib-subcat-msg", err.message, true);
    }
});


// ==========================================
// ITEMS
// ==========================================
async function loadLibraryItems() {
    const list = document.getElementById("lib-items-list");
    if (!list) return;

    try {
        const { data, error } = await supabase
            .from("library_items")
            .select("*, library_subcategories(name, library_categories(name))")
            .order("created_at", { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            list.innerHTML = `<p class="text-gray-500 text-sm text-center">No library items found.</p>`;
            return;
        }

        list.innerHTML = data.map(item => `
            <div class="flex items-center justify-between bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div class="flex items-center gap-4">
                    ${item.main_image ? `<img src="${escapeHtml(item.main_image)}" class="w-12 h-12 rounded object-cover">` : `<div class="w-12 h-12 bg-gray-700 rounded flex items-center justify-center"><i class="fa-solid fa-code text-gray-400"></i></div>`}
                    <div class="flex flex-col">
                        <span class="text-white font-bold">${escapeHtml(item.title)}</span>
                        <span class="text-xs text-gray-400">${escapeHtml(item.library_subcategories?.library_categories?.name)} / ${escapeHtml(item.library_subcategories?.name)}</span>
                    </div>
                </div>
                <div class="flex gap-2 items-center">
                    <button class="edit-item-btn text-blue-400 hover:text-blue-300 transition p-2" data-id="${item.id}">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <a href="./library-details.html?id=${item.id}" target="_blank" class="text-green-400 hover:text-green-300 transition p-2"><i class="fa-solid fa-eye"></i></a>
                    <button class="delete-item-btn text-red-500 hover:text-red-400 transition p-2" data-id="${item.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join("");

        // Edit Item Listeners
        list.querySelectorAll(".edit-item-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                await openEditItemModal(btn.dataset.id);
            });
        });

        // Delete Item Listeners
        list.querySelectorAll(".delete-item-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                if (!confirm("Are you sure you want to delete this library item and all its content?")) return;
                try {
                    const id = btn.dataset.id;
                    await supabase.from("library_item_media").delete().eq("library_item_id", id);
                    await supabase.from("library_item_sections").delete().eq("library_item_id", id);
                    await supabase.from("library_item_links").delete().eq("library_item_id", id);
                    const { error } = await supabase.from("library_items").delete().eq("id", id);
                    if (error) throw error;
                    loadLibraryItems();
                } catch (err) {
                    alert("Error deleting item: " + err.message);
                }
            });
        });

    } catch (err) {
        list.innerHTML = `<p class="text-red-500 text-sm">Error loading items.</p>`;
    }
}


// ==========================================
// ADD/EDIT ITEM MODAL UI
// ==========================================
const modal = document.getElementById("lib-add-item-modal");
const cancelBtn = document.getElementById("lib-cancel-item-btn");
const saveBtn = document.getElementById("lib-save-item-btn");
const form = document.getElementById("lib-add-item-form");

function resetItemModal() {
    form?.reset();
    delete form.dataset.editId;
    document.getElementById("lib-media-container").innerHTML = "";
    document.getElementById("lib-sections-container").innerHTML = "";
    document.getElementById("lib-links-container").innerHTML = "";
    document.getElementById("lib-modal-title").textContent = "Add Library Item";
    saveBtn.textContent = "Save Item";
}

document.getElementById("lib-add-item-btn")?.addEventListener("click", () => {
    resetItemModal();
    modal?.classList.remove("hidden");
});

cancelBtn?.addEventListener("click", () => {
    modal?.classList.add("hidden");
    resetItemModal();
});

// Create Dynamic Row functions
function addMediaRow(url = "", order = 0) {
    const container = document.getElementById("lib-media-container");
    if (container.innerHTML.includes("No gallery images")) container.innerHTML = "";
    
    const div = document.createElement("div");
    div.className = "flex gap-2 items-center lib-media-row";
    div.innerHTML = `
        <input type="text" placeholder="Image URL" value="${escapeHtml(url)}" class="lib-media-url flex-1 bg-gray-900 border border-gray-600 p-2 rounded focus:ring-1 focus:ring-yellow-500 text-sm">
        <input type="number" placeholder="Order" value="${order}" class="lib-media-order w-20 bg-gray-900 border border-gray-600 p-2 rounded focus:ring-1 focus:ring-yellow-500 text-sm">
        <button type="button" class="text-red-400 hover:text-red-300 px-2" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
    `;
    container.appendChild(div);
}

function addSectionRow(title = "", lang = "", order = 0, desc = "", code = "", notes = "") {
    const container = document.getElementById("lib-sections-container");
    if (container.innerHTML.includes("No content sections")) container.innerHTML = "";
    
    const div = document.createElement("div");
    div.className = "flex flex-col gap-3 p-4 bg-gray-900 border border-gray-600 rounded-lg lib-section-row relative";
    div.innerHTML = `
        <button type="button" class="absolute top-3 right-3 text-red-400 hover:text-red-300" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
        <div class="grid md:grid-cols-2 gap-3 pr-6">
            <input type="text" placeholder="Section Title" value="${escapeHtml(title)}" class="lib-sec-title bg-gray-800 border border-gray-700 p-2.5 rounded w-full text-sm">
            <div class="flex gap-2">
                <input type="text" placeholder="Lang (e.g. js, html)" value="${escapeHtml(lang)}" class="lib-sec-lang bg-gray-800 border border-gray-700 p-2.5 rounded w-32 text-sm">
                <input type="number" placeholder="Order" value="${order}" class="lib-sec-order bg-gray-800 border border-gray-700 p-2.5 rounded w-20 text-sm">
            </div>
        </div>
        <textarea placeholder="Description..." rows="2" class="lib-sec-desc bg-gray-800 border border-gray-700 p-2.5 rounded w-full text-sm">${escapeHtml(desc)}</textarea>
        <textarea placeholder="Code Content..." rows="5" class="lib-sec-code bg-gray-800 border border-gray-700 p-2.5 rounded w-full font-mono text-amber-500 text-sm">${escapeHtml(code)}</textarea>
        <input type="text" placeholder="Notes (optional)" value="${escapeHtml(notes)}" class="lib-sec-notes bg-gray-800 border border-gray-700 p-2.5 rounded w-full text-sm">
    `;
    container.appendChild(div);
}

function addLinkRow(title = "", url = "", type = "default", order = 0) {
    const container = document.getElementById("lib-links-container");
    if (container.innerHTML.includes("No action links")) container.innerHTML = "";
    
    const div = document.createElement("div");
    div.className = "flex gap-2 items-center lib-link-row flex-wrap sm:flex-nowrap bg-gray-900 p-3 rounded border border-gray-600";
    div.innerHTML = `
        <input type="text" placeholder="Link Title" value="${escapeHtml(title)}" class="lib-link-title w-full sm:w-1/4 bg-gray-800 border border-gray-700 p-2 rounded text-sm">
        <input type="text" placeholder="URL" value="${escapeHtml(url)}" class="lib-link-url flex-1 bg-gray-800 border border-gray-700 p-2 rounded text-sm">
        <select class="lib-link-type w-full sm:w-32 bg-gray-800 border border-gray-700 p-2 rounded text-sm text-gray-300">
            <option value="default" ${type==='default'?'selected':''}>Default</option>
            <option value="demo" ${type==='demo'?'selected':''}>Demo</option>
            <option value="github" ${type==='github'?'selected':''}>GitHub</option>
            <option value="doc" ${type==='doc'?'selected':''}>Doc</option>
            <option value="source" ${type==='source'?'selected':''}>Source</option>
            <option value="download_zip" ${type==='download_zip'?'selected':''}>Download</option>
        </select>
        <input type="number" placeholder="Order" value="${order}" class="lib-link-order w-20 bg-gray-800 border border-gray-700 p-2 rounded text-sm">
        <button type="button" class="text-red-400 hover:text-red-300 px-2" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
    `;
    container.appendChild(div);
}

// Button Listeners
document.getElementById("lib-add-media-btn")?.addEventListener("click", () => addMediaRow());
document.getElementById("lib-add-section-btn")?.addEventListener("click", () => addSectionRow());
document.getElementById("lib-add-link-btn")?.addEventListener("click", () => addLinkRow());

// Load Item into Modal for Editing
async function openEditItemModal(itemId) {
    try {
        resetItemModal();
        modal.classList.remove("hidden");
        document.getElementById("lib-modal-title").textContent = "Loading Item Details...";

        // Fetch Main Item
        const { data: item, error: itemErr } = await supabase.from("library_items").select("*").eq("id", itemId).single();
        if (itemErr) throw itemErr;

        // Fetch Children
        const [ {data: media}, {data: sections}, {data: links} ] = await Promise.all([
            supabase.from("library_item_media").select("*").eq("library_item_id", itemId).order("sort_order"),
            supabase.from("library_item_sections").select("*").eq("library_item_id", itemId).order("sort_order"),
            supabase.from("library_item_links").select("*").eq("library_item_id", itemId).order("sort_order")
        ]);

        // Populate Main Form
        document.getElementById("lib-item-title").value = item.title || "";
        document.getElementById("lib-item-subcat").value = item.subcategory_id || "";
        document.getElementById("lib-item-main-img").value = item.main_image || "";
        document.getElementById("lib-item-short-desc").value = item.short_description || "";
        document.getElementById("lib-item-techs").value = item.technologies ? item.technologies.join(", ") : "";

        // Populate Dynamic Rows
        if (media && media.length) media.forEach(m => addMediaRow(m.media_url, m.sort_order));
        if (sections && sections.length) sections.forEach(s => addSectionRow(s.title, s.code_language, s.sort_order, s.description, s.code_content, s.notes));
        if (links && links.length) links.forEach(l => addLinkRow(l.title, l.url, l.link_type, l.sort_order));

        form.dataset.editId = itemId;
        document.getElementById("lib-modal-title").textContent = "Edit Library Item";
        saveBtn.textContent = "Update Item";

    } catch (err) {
        alert("Failed to load item for editing: " + err.message);
        modal.classList.add("hidden");
    }
}

// Save / Update Item
saveBtn?.addEventListener("click", async () => {
    const title = document.getElementById("lib-item-title").value.trim();
    const subcategory_id = document.getElementById("lib-item-subcat").value;
    const editId = form.dataset.editId;
    
    if (!title || !subcategory_id) {
        alert("Title and Subcategory are required!");
        return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>' + (editId ? 'Updating...' : 'Saving...');

    const short_description = document.getElementById("lib-item-short-desc").value.trim() || null;
    const main_image = document.getElementById("lib-item-main-img").value.trim() || null;
    const techsRaw = document.getElementById("lib-item-techs").value.trim();
    const technologies = techsRaw ? techsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

    try {
        let itemId = editId;

        if (editId) {
            // Update existing
            const { error: itemErr } = await supabase.from("library_items")
                .update({ subcategory_id, title, short_description, main_image, technologies })
                .eq("id", editId);
            if (itemErr) throw itemErr;

            // Delete existing child rows for a clean replacement
            await supabase.from("library_item_media").delete().eq("library_item_id", editId);
            await supabase.from("library_item_sections").delete().eq("library_item_id", editId);
            await supabase.from("library_item_links").delete().eq("library_item_id", editId);
        } else {
            // Insert new
            const { data: itemData, error: itemErr } = await supabase.from("library_items")
                .insert([{ subcategory_id, title, short_description, main_image, technologies }])
                .select().single();
            if (itemErr) throw itemErr;
            itemId = itemData.id;
        }

        // Gather & Insert Media
        const mediaRows = document.querySelectorAll(".lib-media-row");
        const mediaInserts = [];
        mediaRows.forEach(row => {
            const url = row.querySelector(".lib-media-url").value.trim();
            const order = parseInt(row.querySelector(".lib-media-order").value) || 0;
            if (url) mediaInserts.push({ library_item_id: itemId, media_url: url, sort_order: order });
        });
        if (mediaInserts.length) await supabase.from("library_item_media").insert(mediaInserts);

        // Gather & Insert Sections
        const sectionRows = document.querySelectorAll(".lib-section-row");
        const sectionInserts = [];
        sectionRows.forEach(row => {
            const secTitle = row.querySelector(".lib-sec-title").value.trim();
            const secLang = row.querySelector(".lib-sec-lang").value.trim();
            const secOrder = parseInt(row.querySelector(".lib-sec-order").value) || 0;
            const secDesc = row.querySelector(".lib-sec-desc").value.trim() || null;
            const secCode = row.querySelector(".lib-sec-code").value.trim() || null;
            const secNotes = row.querySelector(".lib-sec-notes").value.trim() || null;
            
            if (secTitle) {
                sectionInserts.push({ library_item_id: itemId, title: secTitle, description: secDesc, code_content: secCode, code_language: secLang, notes: secNotes, sort_order: secOrder });
            }
        });
        if (sectionInserts.length) await supabase.from("library_item_sections").insert(sectionInserts);

        // Gather & Insert Links
        const linkRows = document.querySelectorAll(".lib-link-row");
        const linkInserts = [];
        linkRows.forEach(row => {
            const lTitle = row.querySelector(".lib-link-title").value.trim();
            const lUrl = row.querySelector(".lib-link-url").value.trim();
            const lType = row.querySelector(".lib-link-type").value;
            const lOrder = parseInt(row.querySelector(".lib-link-order").value) || 0;
            if (lTitle && lUrl) {
                linkInserts.push({ library_item_id: itemId, title: lTitle, url: lUrl, link_type: lType, sort_order: lOrder });
            }
        });
        if (linkInserts.length) await supabase.from("library_item_links").insert(linkInserts);

        // Cleanup & Reload
        modal.classList.add("hidden");
        loadLibraryItems();
        alert(editId ? "Library Item updated successfully!" : "Library Item saved successfully!");

    } catch (err) {
        alert("Failed to save item: " + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = editId ? "Update Item" : "Save Item";
    }
});


// ==========================================
// SEARCH ITEMS
// ==========================================
document.getElementById("lib-items-search")?.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const rows = document.querySelectorAll("#lib-items-list > div");
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? "" : "none";
    });
});

// ==========================================
// INIT
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        if (document.getElementById("library-content")) {
            loadLibraryCategories();
            loadLibrarySubcategories();
            loadLibraryItems();
        }
    }, 500);
});

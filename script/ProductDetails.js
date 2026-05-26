// ================= COMMENTS =================

const commentsContainer = document.getElementById("commentsContainer");
const commentInput = document.getElementById("commentInput");
const addCommentBtn = document.getElementById("addCommentBtn");

let comments = [];

// ================= RENDER =================
function renderComments() {
    commentsContainer.innerHTML = "";

    comments.forEach((c, index) => {
        commentsContainer.innerHTML += `
        <div class="bg-gray-950 border border-gray-800 rounded-2xl p-5 relative">

            <!-- 3 dots -->
            <div class="absolute top-3 right-3">
                <button onclick="toggleMenu(${index})" class="text-gray-400 hover:text-white">
                    <i class="fa-solid fa-ellipsis"></i>
                </button>

                <div id="menu-${index}" class="hidden absolute right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg text-sm z-10">
                    <button onclick="editComment(${index})"
                        class="block px-4 py-2 hover:bg-gray-700 w-full text-left">
                        Edit
                    </button>
                    <button onclick="deleteComment(${index})"
                        class="block px-4 py-2 hover:bg-red-600 w-full text-left text-red-400">
                        Delete
                    </button>
                </div>
            </div>

            <div class="flex items-start gap-4">
                <img src="./img/avatar1.png" class="w-12 h-12 rounded-full">

                <div class="flex-1">
                    <h4 class="font-semibold">You</h4>

                    <p class="comment-text text-gray-300 mt-2">${c.text}</p>

                    <div class="flex gap-3 mt-3 text-sm text-gray-400">
                        <button onclick="like(${index})" class="hover:text-red-400">
                            <i class="fa-regular fa-heart"></i> ${c.likes}
                        </button>

                        <button onclick="dislike(${index})" class="hover:text-blue-400">
                            <i class="fa-regular fa-thumbs-down"></i> ${c.dislikes}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    });
}

// ================= ADD =================
addCommentBtn.addEventListener("click", () => {
    const text = commentInput.value.trim();
    if (!text) return;

    comments.unshift({
        text,
        likes: 0,
        dislikes: 0
    });

    commentInput.value = "";
    renderComments();
});

// ================= LIKE =================
function like(i) {
    comments[i].likes++;
    renderComments();
}

// ================= DISLIKE =================
function dislike(i) {
    comments[i].dislikes++;
    renderComments();
}

// ================= DELETE =================
function deleteComment(i) {
    comments.splice(i, 1);
    renderComments();
}

// ================= EDIT =================
function editComment(i) {
    const newText = prompt("Edit your comment:", comments[i].text);

    if (newText !== null && newText.trim() !== "") {
        comments[i].text = newText;
        renderComments();
    }
}

// ================= MENU =================
function toggleMenu(i) {

    // اقفل كل المينيوهات
    document.querySelectorAll("[id^='menu-']").forEach(menu => {
        menu.classList.add("hidden");
    });

    // افتح الحالي
    const menu = document.getElementById(`menu-${i}`);
    menu.classList.toggle("hidden");
}

// قفل عند الضغط برا
document.addEventListener("click", (e) => {
    if (!e.target.closest(".fa-ellipsis")) {
        document.querySelectorAll("[id^='menu-']").forEach(menu => {
            menu.classList.add("hidden");
        });
    }
});


// ================= SHARE =================

const shareBtn = document.getElementById("shareBtn");
const shareModal = document.getElementById("shareModal");
const closeShare = document.getElementById("closeShare");
const shareLink = document.getElementById("shareLink");
const copyBtn = document.getElementById("copyBtn");

// open
shareBtn.addEventListener("click", () => {
    shareModal.classList.remove("hidden");
    shareModal.classList.add("flex");

    shareLink.value = window.location.href;
});

// close
closeShare.addEventListener("click", () => {
    shareModal.classList.add("hidden");
});

// copy
copyBtn.addEventListener("click", () => {
    shareLink.select();
    document.execCommand("copy");

    copyBtn.innerHTML = "✔";
    setTimeout(() => {
        copyBtn.innerHTML = `<i class="fa-solid fa-copy"></i>`;
    }, 1000);
});

// close outside
shareModal.addEventListener("click", (e) => {
    if (e.target === shareModal) {
        shareModal.classList.add("hidden");
    }
});
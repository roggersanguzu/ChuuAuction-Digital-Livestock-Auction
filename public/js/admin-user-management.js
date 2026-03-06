(function () {
  var tableBody = document.getElementById("users-table-body");
  if (!tableBody) return;

  var state = {
    search: "",
    role: "all",
    status: "all",
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    users: [],
  };

  function toast(message, level) {
    if (typeof window.showToast === "function") {
      window.showToast(message, level || "info");
    } else {
      console.log("[admin-users]", message);
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function initials(name) {
    var clean = String(name || "").trim();
    if (!clean) return "?";
    var parts = clean.split(/\s+/).slice(0, 2);
    return parts.map(function (p) { return p[0]; }).join("").toUpperCase();
  }

  function formatRole(role) {
    var r = String(role || "").toLowerCase();
    if (r === "seller" || r === "farmer") return "Farmer";
    if (r === "administrator" || r === "admin") return "Admin";
    return "Buyer";
  }

  function formatDate(value) {
    var date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-UG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  async function api(path, options) {
    var response = await fetch(path, Object.assign({
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    }, options || {}));

    var payload = null;
    try {
      payload = await response.json();
    } catch (_) {
      payload = null;
    }

    if (!response.ok || !payload || payload.success === false) {
      var msg = (payload && payload.message) || "Request failed";
      throw new Error(msg);
    }
    return payload;
  }

  function buildQuery() {
    var query = new URLSearchParams();
    query.set("search", state.search);
    query.set("role", state.role);
    query.set("status", state.status);
    query.set("sortBy", state.sortBy);
    query.set("sortOrder", state.sortOrder);
    query.set("page", String(state.page));
    query.set("limit", String(state.limit));
    return query.toString();
  }

  function renderRows(users) {
    var roleStyles = {
      Farmer: "bg-orange-500/15 text-orange-400",
      Buyer: "bg-blue-500/15 text-blue-400",
      Admin: "bg-purple-500/15 text-purple-400",
    };

    var statusStyles = {
      active: "bg-green-500/15 text-green-400",
      inactive: "bg-gray-500/15 text-gray-400",
      suspended: "bg-red-500/15 text-red-400",
    };

    if (!users.length) {
      tableBody.innerHTML =
        '<tr><td colspan="7" class="px-5 py-10 text-center text-gray-500">No users found for the current filters.</td></tr>';
      return;
    }

    tableBody.innerHTML = users.map(function (u, i) {
      var roleLabel = formatRole(u.role);
      var status = String(u.accountStatus || "active").toLowerCase();
      var statusClass = statusStyles[status] || statusStyles.inactive;
      var roleClass = roleStyles[roleLabel] || roleStyles.Buyer;
      var selfTag = u.isCurrentUser ? '<span class="ml-2 text-[10px] text-orange-400">(You)</span>' : "";

      return (
        '<tr class="border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors group animate-slide-up" style="animation-delay:' + (i * 0.03) + 's;">' +
          '<td class="px-5 py-3.5">' +
            '<div class="flex items-center gap-3">' +
              '<div class="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-xs font-bold">' + escapeHtml(initials(u.name)) + "</div>" +
              '<span class="font-semibold text-sm group-hover:text-orange-400 transition-colors">' + escapeHtml(u.name) + selfTag + "</span>" +
            "</div>" +
          "</td>" +
          '<td class="px-5 py-3.5 text-sm text-gray-400">' + escapeHtml(u.email || "-") + "<br><span class=\"text-[11px] text-gray-600\">" + escapeHtml(u.phone || "No phone") + "</span></td>" +
          '<td class="px-5 py-3.5"><span class="text-[11px] px-2.5 py-0.5 rounded-full ' + roleClass + ' font-semibold capitalize">' + escapeHtml(roleLabel) + "</span></td>" +
          '<td class="px-5 py-3.5"><span class="text-[11px] px-2.5 py-0.5 rounded-full ' + statusClass + ' font-semibold capitalize">' + escapeHtml(status) + "</span></td>" +
          '<td class="px-5 py-3.5 text-sm text-gray-400">' + escapeHtml(formatDate(u.createdAt)) + "</td>" +
          '<td class="px-5 py-3.5 text-sm font-semibold text-white">UGX 0</td>' +
          '<td class="px-5 py-3.5">' +
            '<div class="flex items-center justify-center gap-1">' +
              '<button class="w-7 h-7 rounded-lg hover:bg-blue-500/15 flex items-center justify-center transition-colors" title="Edit" data-action="edit" data-id="' + escapeHtml(u._id) + '"><i class="bi bi-pencil text-blue-400 text-xs"></i></button>' +
              '<button class="w-7 h-7 rounded-lg hover:bg-amber-500/15 flex items-center justify-center transition-colors" title="Change Status" data-action="status" data-id="' + escapeHtml(u._id) + '" data-status="' + escapeHtml(status) + '"><i class="bi bi-toggle-on text-amber-400 text-xs"></i></button>' +
              '<button class="w-7 h-7 rounded-lg hover:bg-indigo-500/15 flex items-center justify-center transition-colors" title="Reset Password" data-action="password" data-id="' + escapeHtml(u._id) + '"><i class="bi bi-key text-indigo-400 text-xs"></i></button>' +
              '<button class="w-7 h-7 rounded-lg hover:bg-red-500/15 flex items-center justify-center transition-colors" title="Delete" data-action="delete" data-id="' + escapeHtml(u._id) + '"><i class="bi bi-trash text-red-400 text-xs"></i></button>' +
            "</div>" +
          "</td>" +
        "</tr>"
      );
    }).join("");
  }

  function renderPagination() {
    var label = document.getElementById("user-count-label");
    var numbers = document.getElementById("users-page-numbers");
    var prev = document.getElementById("users-prev-page");
    var next = document.getElementById("users-next-page");
    if (!label || !numbers || !prev || !next) return;

    var from = state.total === 0 ? 0 : ((state.page - 1) * state.limit) + 1;
    var to = Math.min(state.total, state.page * state.limit);
    label.textContent = "Showing " + from + "-" + to + " of " + state.total;

    prev.disabled = state.page <= 1;
    next.disabled = state.page >= state.totalPages;
    prev.classList.toggle("opacity-40", prev.disabled);
    next.classList.toggle("opacity-40", next.disabled);

    var pages = [];
    for (var p = Math.max(1, state.page - 1); p <= Math.min(state.totalPages, state.page + 1); p += 1) {
      pages.push(p);
    }

    numbers.innerHTML = pages.map(function (p) {
      var active = p === state.page;
      return '<button class="w-8 h-8 rounded-lg ' +
        (active
          ? "bg-orange-500/20 text-orange-400"
          : "hover:bg-gray-800/50 text-gray-500 hover:text-white") +
        ' flex items-center justify-center text-xs font-bold transition-colors" data-page="' + p + '">' + p + "</button>";
    }).join("");
  }

  async function loadUsers() {
    try {
      var payload = await api("/api/user/admin/users?" + buildQuery());
      var list = Array.isArray(payload.data) ? payload.data : [];
      var currentUserId = document.getElementById("dashboard-stats-context")
        ? document.getElementById("dashboard-stats-context").getAttribute("data-user-id")
        : null;

      state.users = list.map(function (u) {
        return Object.assign({}, u, {
          isCurrentUser: currentUserId ? String(currentUserId) === String(u._id) : false,
        });
      });
      state.total = payload.pagination.total;
      state.totalPages = payload.pagination.totalPages;
      renderRows(state.users);
      renderPagination();
    } catch (error) {
      renderRows([]);
      toast(error.message || "Failed to load users", "error");
    }
  }

  function roleValueFromLabel(label) {
    var value = String(label || "").toLowerCase();
    if (value === "farmer" || value === "seller") return "seller";
    if (value === "admin" || value === "administrator") return "administrator";
    return "buyer";
  }

  function openUserModal(user) {
    var isEdit = !!user;
    var modal = document.createElement("div");
    modal.className = "fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    modal.innerHTML =
      '<div class="w-full max-w-lg glass border border-gray-800/50 rounded-2xl p-5">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<h3 class="text-lg font-black font-display">' + (isEdit ? "Edit User" : "Create User") + "</h3>" +
          '<button type="button" class="w-8 h-8 rounded-lg hover:bg-gray-800/50 text-gray-400" data-close><i class="bi bi-x-lg"></i></button>' +
        "</div>" +
        '<form id="admin-user-form" class="space-y-3">' +
          '<input type="text" name="name" required placeholder="Full name" value="' + escapeHtml(isEdit ? user.name : "") + '" class="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white">' +
          '<input type="email" name="email" required placeholder="Email address" value="' + escapeHtml(isEdit ? user.email : "") + '" class="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white">' +
          '<input type="text" name="phone" placeholder="Phone number" value="' + escapeHtml(isEdit ? (user.phone || "") : "") + '" class="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white">' +
          '<select name="role" class="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white">' +
            '<option value="seller"' + (formatRole(isEdit ? user.role : "") === "Farmer" ? " selected" : "") + ">Farmer</option>" +
            '<option value="buyer"' + (formatRole(isEdit ? user.role : "Buyer") === "Buyer" ? " selected" : "") + ">Buyer</option>" +
            '<option value="administrator"' + (formatRole(isEdit ? user.role : "") === "Admin" ? " selected" : "") + ">Admin</option>" +
          "</select>" +
          (isEdit
            ? ""
            : '<input type="password" name="password" required minlength="6" placeholder="Temporary password (min 6 chars)" class="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white">') +
          '<div class="flex items-center justify-end gap-2 pt-2">' +
            '<button type="button" class="px-4 py-2 rounded-xl border border-gray-700 text-gray-300 text-sm" data-close>Cancel</button>' +
            '<button type="submit" class="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-sm font-semibold">' + (isEdit ? "Save Changes" : "Create User") + "</button>" +
          "</div>" +
        "</form>" +
      "</div>";

    document.body.appendChild(modal);

    function close() {
      modal.remove();
    }

    modal.querySelectorAll("[data-close]").forEach(function (btn) {
      btn.addEventListener("click", close);
    });

    modal.addEventListener("click", function (event) {
      if (event.target === modal) close();
    });

    modal.querySelector("#admin-user-form").addEventListener("submit", async function (event) {
      event.preventDefault();
      var fd = new FormData(event.target);
      var payload = {
        name: String(fd.get("name") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        phone: String(fd.get("phone") || "").trim(),
        role: roleValueFromLabel(fd.get("role")),
      };
      if (!isEdit) payload.password = String(fd.get("password") || "");

      try {
        if (isEdit) {
          await api("/api/user/admin/users/" + encodeURIComponent(user._id), {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
          toast("User updated successfully", "success");
        } else {
          await api("/api/user/admin/users", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          toast("User created successfully", "success");
        }
        close();
        loadUsers();
      } catch (error) {
        toast(error.message || "Failed to save user", "error");
      }
    });
  }

  function getUserById(id) {
    return state.users.find(function (u) { return String(u._id) === String(id); });
  }

  async function updateStatus(userId, currentStatus) {
    var next = "active";
    if (currentStatus === "active") next = "inactive";
    if (currentStatus === "inactive") next = "suspended";
    if (currentStatus === "suspended") next = "active";

    try {
      await api("/api/user/admin/users/" + encodeURIComponent(userId) + "/status", {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      toast("User status updated to " + next, "success");
      loadUsers();
    } catch (error) {
      toast(error.message || "Failed to update status", "error");
    }
  }

  async function resetPassword(userId) {
    var value = window.prompt("Enter new password (min 6 characters):");
    if (!value) return;
    try {
      await api("/api/user/admin/users/" + encodeURIComponent(userId) + "/password", {
        method: "PATCH",
        body: JSON.stringify({ newPassword: value }),
      });
      toast("Password reset successfully", "success");
    } catch (error) {
      toast(error.message || "Failed to reset password", "error");
    }
  }

  async function deleteUser(userId) {
    var user = getUserById(userId);
    var label = user ? user.name : "this user";
    if (!window.confirm("Delete " + label + "? This action cannot be undone.")) return;
    try {
      await api("/api/user/admin/users/" + encodeURIComponent(userId), {
        method: "DELETE",
      });
      toast("User deleted successfully", "success");
      loadUsers();
    } catch (error) {
      toast(error.message || "Failed to delete user", "error");
    }
  }

  function downloadCsv() {
    var rows = [["Name", "Email", "Phone", "Role", "Status", "Joined"]];
    state.users.forEach(function (u) {
      rows.push([
        String(u.name || ""),
        String(u.email || ""),
        String(u.phone || ""),
        formatRole(u.role),
        String(u.accountStatus || "active"),
        formatDate(u.createdAt),
      ]);
    });
    var csv = rows.map(function (r) {
      return r.map(function (cell) {
        return '"' + String(cell).replace(/"/g, '""') + '"';
      }).join(",");
    }).join("\n");

    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "users-export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  var searchInput = document.getElementById("user-search");
  var roleFilter = document.getElementById("role-filter");
  var statusFilter = document.getElementById("status-filter");
  var addUserBtn = document.getElementById("add-user-btn");
  var exportBtn = document.getElementById("export-users-btn");
  var prevBtn = document.getElementById("users-prev-page");
  var nextBtn = document.getElementById("users-next-page");
  var numbersEl = document.getElementById("users-page-numbers");

  var searchTimer = null;
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.search = searchInput.value.trim();
        state.page = 1;
        loadUsers();
      }, 250);
    });
  }

  if (roleFilter) {
    roleFilter.addEventListener("change", function () {
      state.role = roleFilter.value;
      state.page = 1;
      loadUsers();
    });
  }
  if (statusFilter) {
    statusFilter.addEventListener("change", function () {
      state.status = statusFilter.value;
      state.page = 1;
      loadUsers();
    });
  }

  if (addUserBtn) {
    addUserBtn.onclick = null;
    addUserBtn.addEventListener("click", function () {
      openUserModal(null);
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      downloadCsv();
      toast("CSV export ready", "success");
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      if (state.page > 1) {
        state.page -= 1;
        loadUsers();
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      if (state.page < state.totalPages) {
        state.page += 1;
        loadUsers();
      }
    });
  }
  if (numbersEl) {
    numbersEl.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-page]");
      if (!btn) return;
      state.page = Number.parseInt(btn.getAttribute("data-page"), 10) || 1;
      loadUsers();
    });
  }

  tableBody.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-action]");
    if (!btn) return;
    var userId = btn.getAttribute("data-id");
    var action = btn.getAttribute("data-action");
    if (!userId || !action) return;

    if (action === "edit") {
      var user = getUserById(userId);
      if (user) openUserModal(user);
      return;
    }
    if (action === "status") {
      updateStatus(userId, btn.getAttribute("data-status"));
      return;
    }
    if (action === "password") {
      resetPassword(userId);
      return;
    }
    if (action === "delete") {
      deleteUser(userId);
    }
  });

  window.filterUsers = function () {
    state.search = searchInput ? searchInput.value.trim() : "";
    state.role = roleFilter ? roleFilter.value : "all";
    state.status = statusFilter ? statusFilter.value : "all";
    state.page = 1;
    loadUsers();
  };

  window.sortUsers = function (field) {
    var mappedField = field === "status" ? "accountStatus" : field;
    if (state.sortBy === mappedField) {
      state.sortOrder = state.sortOrder === "asc" ? "desc" : "asc";
    } else {
      state.sortBy = mappedField;
      state.sortOrder = "asc";
    }
    state.page = 1;
    loadUsers();
    toast("Sorted by " + field, "info");
  };

  loadUsers();
})();

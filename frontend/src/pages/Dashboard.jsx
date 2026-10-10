import { useMemo, useState } from "react";
import { useApolloClient, useQuery, useMutation } from "@apollo/client/react";
import { Link, useNavigate } from "react-router-dom";
import { GET_USERS } from "../graphql/queries";
import { CREATE_USER, UPDATE_USER, DELETE_USER, LOGOUT } from "../graphql/mutations";
import { GET_ME } from "../graphql/queries";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
function getImageUrl(imageUrl) {
  if (!imageUrl) return "";

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  return `${API_URL}/${imageUrl.replace(/^\/+/, "")}`;
}

function UserAvatar({ user, size = "h-10 w-10" }) {
  const [imageFailed, setImageFailed] = useState(false);

  const imageUrl = getImageUrl(user?.profileImageUrl);

  return (
    <div
      className={`${size} grid shrink-0 place-items-center overflow-hidden rounded-full bg-indigo-50 font-bold text-indigo-700`}
    >
      {imageUrl && !imageFailed ? (
        <img
          key={imageUrl}
          src={imageUrl}
          alt={`${user?.name || "User"} profile`}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        user?.name?.trim()?.charAt(0)?.toUpperCase() || "U"
      )}
    </div>
  );
}
const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "USER",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const primaryButton =
  "inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButton =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50";

export default function Dashboard() {
  const navigate = useNavigate();
  const apolloClient = useApolloClient();
  const [logoutMutation] = useMutation(LOGOUT);

  const { data, loading, error, refetch } = useQuery(GET_USERS, {
    fetchPolicy: "cache-and-network",
  });

  const [createUser, createState] = useMutation(CREATE_USER);
  const [updateUser, updateState] = useMutation(UPDATE_USER);
  const [deleteUser, deleteState] = useMutation(DELETE_USER);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const users = data?.getUsers ?? [];

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) =>
      [user.name, user.email, user.role].some((value) =>
        value?.toLowerCase().includes(query),
      ),
    );
  }, [users, search]);

  const activeCount = users.filter((user) => user.isActive).length;

  async function logout() {
    try {
      await logoutMutation();
    } finally {
      await apolloClient.clearStore();
      navigate("/login", { replace: true });
    }
  }

  function startEdit(user) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    try {
      if (editingId) {
        await updateUser({
          variables: {
            id: editingId,
            input: {
              name: form.name.trim(),
              email: form.email.trim(),
              role: form.role,
            },
          },
        });

        showMessage("User updated successfully.");
      } else {
        await createUser({
          variables: {
            input: {
              ...form,
              name: form.name.trim(),
              email: form.email.trim(),
            },
          },
        });

        showMessage("User created successfully.");
      }

      resetForm();
      await refetch();
    } catch (err) {
      showMessage(err.message, "error");
    }
  }

  const { data: meData } = useQuery(GET_ME, {
    fetchPolicy: "cache-and-network",
  });

  const currentUser = meData?.me;

  async function handleDelete(user) {
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteUser({ variables: { id: user.id } });
      showMessage("User deleted successfully.");
      await refetch();
    } catch (err) {
      showMessage(err.message, "error");
    }
  }

  if (loading && !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="mt-4 text-sm text-slate-500">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-5">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-xl text-amber-600">
            !
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Unable to load users
          </h2>
          <p className="mt-2 break-words text-sm text-slate-500">
            {error.message}
          </p>
          <button onClick={logout} className={`${primaryButton} mt-6`}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-slate-950 text-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 text-lg font-bold">
            U
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">UserFlow</p>
            <p className="text-xs text-slate-400">Management Console</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-indigo-500/15 px-4 py-3 font-medium text-indigo-300">
            <span>▦</span>
            Dashboard
          </div>
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <span>◎</span>
            My Profile
          </Link>
        </nav>

        <div className="m-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium">User Management</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Manage accounts from one place.
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs text-slate-400">Workspace / Overview</p>
            <h1 className="font-semibold text-slate-900">Dashboard</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              className="flex items-center gap-2"
              aria-label="Open my profile"
            >
              <UserAvatar user={currentUser} size="h-10 w-10" />

              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-800">
                  {currentUser?.name || "My Profile"}
                </p>
                <p className="text-xs text-slate-500">
                  {currentUser?.role || ""}
                </p>
              </div>
            </Link>

            <button onClick={logout} className={secondaryButton}>
              Logout
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-8">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-indigo-600">
                USER ADMINISTRATION
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Welcome to your workspace
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Manage your users and account information.
              </p>
            </div>

            <button
              onClick={() => {
                resetForm();
                document.getElementById("user-form")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className={primaryButton}
            >
              <span className="mr-2 text-lg">+</span> Add new user
            </button>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Total users"
              value={users.length}
              detail="All registered accounts"
              symbol="♙"
              color="indigo"
            />
            <StatCard
              label="Active users"
              value={activeCount}
              detail="Accounts marked active"
              symbol="✓"
              color="emerald"
            />
            <StatCard
              label="Inactive users"
              value={users.length - activeCount}
              detail="Accounts marked inactive"
              symbol="◷"
              color="amber"
            />
          </section>

          <section
            id="user-form"
            className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingId ? "Edit user" : "Create a user"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {editingId
                    ? "Update the selected account details."
                    : "Enter the details to add a new account."}
                </p>
              </div>
              <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                {editingId ? "EDIT MODE" : "NEW ACCOUNT"}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Full name
                <input
                  className={`${inputClass} mt-2`}
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  minLength={2}
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Email address
                <input
                  className={`${inputClass} mt-2`}
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </label>

              {!editingId && (
                <label className="block text-sm font-medium text-slate-700">
                  Temporary password
                  <input
                    className={`${inputClass} mt-2`}
                    type="password"
                    placeholder="At least 8 characters"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    minLength={8}
                    required
                  />
                </label>
              )}

              <label className="block text-sm font-medium text-slate-700">
                Role
                <select
                  className={`${inputClass} mt-2`}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="USER">Regular user</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </label>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button
                  disabled={createState.loading || updateState.loading}
                  className={primaryButton}
                >
                  {createState.loading || updateState.loading
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Create user"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className={secondaryButton}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {message && (
              <p
                role="status"
                className={`mt-5 rounded-xl border p-3 text-sm ${
                  messageType === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {message}
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-7">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  User directory
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredUsers.length} account(s) displayed
                </p>
              </div>

              <div className="relative w-full sm:max-w-xs">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  ⌕
                </span>
                <input
                  className={`${inputClass} pl-9`}
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search users"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} />

                          <div>
                            <p className="font-semibold text-slate-800">
                              {user.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.role === "ADMIN"
                              ? "bg-violet-50 text-violet-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.isActive ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(user)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={deleteState.loading}
                            className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-14 text-center">
                        <p className="font-semibold text-slate-700">
                          No users found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try another search or create a new account.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 px-6 py-4 text-xs text-slate-400">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, detail, symbol, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-400">{detail}</p>
        </div>

        <div
          className={`grid h-11 w-11 place-items-center rounded-xl text-xl font-bold ${colors[color]}`}
        >
          {symbol}
        </div>
      </div>
    </div>
  );
}

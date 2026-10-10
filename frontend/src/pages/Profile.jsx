import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Link, useNavigate } from "react-router-dom";
import { GET_ME } from "../graphql/queries";
import { UPDATE_PROFILE, CHANGE_PASSWORD } from "../graphql/mutations";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const buttonClass =
  "rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60";

export default function Profile() {
  const navigate = useNavigate();

  const { data, loading, error, refetch } = useQuery(GET_ME);

  const [updateProfile, profileState] = useMutation(UPDATE_PROFILE);
  const [changePassword, passwordState] = useMutation(CHANGE_PASSWORD);

  const [form, setForm] = useState({ name: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const user = data?.me;

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name ?? "",
        email: user.email ?? "",
      });
    }
  }, [user]);

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setMessage("");

    try {
      await updateProfile({
        variables: {
          input: {
            name: form.name.trim(),
            email: form.email.trim(),
          },
        },
      });

      await refetch();
      showMessage("Profile updated successfully.");
    } catch (err) {
      showMessage(err.message, "error");
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setMessage("");

    try {
      await changePassword({
        variables: passwordForm,
      });

      localStorage.removeItem("token");
      navigate("/login", { replace: true });
    } catch (err) {
      showMessage(err.message, "error");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading your profile...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-900">
            Unable to load your profile
          </p>
          <p className="mt-2 text-sm text-red-600">
            {error?.message || "User not found"}
          </p>
          <button onClick={logout} className={`${buttonClass} mt-5`}>
            Sign in again
          </button>
        </div>
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/dashboard"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
              My Profile
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              View and manage your account information.
            </p>
          </div>

          <button onClick={logout} className={buttonClass}>
            Logout
          </button>
        </div>

        {/* Profile summary */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-28 bg-gradient-to-r from-indigo-600 to-violet-500" />

          <div className="px-6 pb-6 sm:px-8">
            <div className="-mt-12 flex flex-wrap items-end gap-4">
              <div className="grid h-24 w-24 place-items-center rounded-2xl border-4 border-white bg-indigo-100 text-3xl font-bold text-indigo-700 shadow-sm">
                {initials || "U"}
              </div>

              <div className="pb-2">
                <h2 className="text-xl font-bold text-slate-900">
                  {user.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{user.email}</p>
              </div>

              <span className="mb-3 ml-auto rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                {user.isActive ? "Active account" : "Inactive account"}
              </span>
            </div>

            {/* Account details */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <DetailCard label="Full name" value={user.name} />
              <DetailCard label="Email address" value={user.email} />
              <DetailCard label="Account role" value={user.role} />
              <DetailCard
                label="Account status"
                value={user.isActive ? "Active" : "Inactive"}
              />
              <DetailCard label="User ID" value={user.id} />
            </div>
          </div>
        </section>

        {/* Edit profile */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold text-slate-900">
            Personal information
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Update your name and email address.
          </p>

          <form
            onSubmit={handleProfileSubmit}
            className="mt-6 grid gap-5 sm:grid-cols-2"
          >
            <label className="text-sm font-medium text-slate-700">
              Full name
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                minLength={2}
                required
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Email address
              <input
                className={inputClass}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </label>

            <div className="sm:col-span-2">
              <button className={buttonClass} disabled={profileState.loading}>
                {profileState.loading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </section>

        {/* Change password */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold text-slate-900">Change password</h2>

          <p className="mt-1 text-sm text-slate-500">
            Verify your current password before setting a new one.
          </p>

          <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-5">
            <label className="block text-sm font-medium text-slate-700">
              Current password
              <input
                className={inputClass}
                type="password"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value,
                  })
                }
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              New password
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value,
                  })
                }
                required
              />
            </label>

            <button className={buttonClass} disabled={passwordState.loading}>
              {passwordState.loading ? "Updating..." : "Change password"}
            </button>
          </form>
        </section>

        {/* Feedback message */}
        {message && (
          <p
            role="status"
            className={`mt-5 rounded-xl border p-4 text-sm ${
              messageType === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-800">
        {value || "Not provided"}
      </p>
    </div>
  );
}

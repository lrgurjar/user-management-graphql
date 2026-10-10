import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { Link, useNavigate } from "react-router-dom";
import { REGISTER } from "../graphql/mutations";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [register, { loading, error }] = useMutation(REGISTER);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      await register({
        variables: { input: form },
      });

      navigate("/dashboard", { replace: true });
    } catch {
      // Display the mutation error below.
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 sm:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white">
            U
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Get started with UserFlow today.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {[
            {
              name: "name",
              label: "Full name",
              type: "text",
              placeholder: "Enter your name",
              autoComplete: "name",
            },
            {
              name: "email",
              label: "Email address",
              type: "email",
              placeholder: "you@example.com",
              autoComplete: "email",
            },
            {
              name: "password",
              label: "Password",
              type: "password",
              placeholder: "At least 8 characters",
              autoComplete: "new-password",
            },
          ].map((field) => (
            <div key={field.name}>
              <label
                htmlFor={field.name}
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                {field.label}
              </label>
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                value={form[field.name]}
                onChange={handleChange}
                minLength={field.name === "password" ? 8 : undefined}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                required
              />
            </div>
          ))}

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {error.message}
            </p>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

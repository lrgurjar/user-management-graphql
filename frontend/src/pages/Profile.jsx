import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_ME } from "../graphql/queries";
import { UPDATE_PROFILE, CHANGE_PASSWORD } from "../graphql/mutations";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
function getImageUrl(imageUrl) {
  if (!imageUrl) return "";

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  return `${API_URL}/${imageUrl.replace(/^\/+/, "")}`;
}
export default function Profile() {
  const { data, loading, error, refetch } = useQuery(GET_ME, {
    fetchPolicy: "network-only",
  });

  const [updateProfile, { loading: savingProfile }] =
    useMutation(UPDATE_PROFILE);

  const [changePassword, { loading: changingPassword }] =
    useMutation(CHANGE_PASSWORD);

  const profile = data?.me;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setEmail(profile.email || "");
      setProfileImageUrl(profile.profileImageUrl || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!previewImage) return undefined;

    return () => {
      URL.revokeObjectURL(previewImage);
    };
  }, [previewImage]);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    // Allow selecting the same file again.
    event.target.value = "";

    setImageError("");

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setImageError("Please select a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setImageError("Image size must be less than 2 MB.");
      return;
    }

    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }

    setSelectedImage(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  const handleImageUpload = async () => {
    if (!selectedImage) {
      setImageError("Please choose an image first.");
      return;
    }

    setUploading(true);
    setImageError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);

      const response = await fetch(`${API_URL}/api/users/me/profile-image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Image upload failed.");
      }

      if (!result.profileImageUrl) {
        throw new Error("The server did not return an image URL.");
      }

      // Save the returned URL locally and refresh the GraphQL profile.
      setProfileImageUrl(result.profileImageUrl);
      setSelectedImage(null);
      setPreviewImage("");

      await refetch();

      setMessage("Profile image uploaded successfully.");
    } catch (err) {
      setImageError(err.message || "Unable to upload profile image.");
    } finally {
      setUploading(false);
    }
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await updateProfile({
        variables: {
          input: { name: name.trim(), email: email.trim() },
        },
      });

      await refetch();
      setMessage("Profile updated successfully.");
    } catch (err) {
      setMessage(err.message || "Unable to update profile.");
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setMessage("");

    if (newPassword.length < 8) {
      setMessage("New password must be at least 8 characters.");
      return;
    }

    try {
      await changePassword({
        variables: {
          currentPassword,
          newPassword,
        },
      });

      setCurrentPassword("");
      setNewPassword("");
      setMessage(
        "Password changed successfully. Please log in again if requested.",
      );
    } catch (err) {
      setMessage(err.message || "Unable to change password.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="rounded-xl bg-white p-6 text-center shadow-sm">
          <p className="font-medium text-red-600">
            {error?.message || "Profile not found."}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const displayedImage = previewImage || getImageUrl(profileImageUrl);
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage your account and personal information.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div
            role="status"
            className={`mb-6 rounded-lg border p-4 text-sm ${
              message.toLowerCase().includes("successfully")
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        {/* Profile Image */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Profile Image
          </h2>

          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-indigo-100 bg-indigo-50">
              {displayedImage ? (
                <img
                  key={displayedImage}
                  src={displayedImage}
                  alt={`${profile.name || "User"} profile`}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span className="text-4xl font-bold text-indigo-600">
                  {profile.name?.trim()?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}
            </div>

            <div className="w-full flex-1">
              <h3 className="font-semibold text-gray-800">
                Upload your picture
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                JPG, PNG, or WEBP. Maximum file size: 2 MB.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
                  Choose Image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleImageUpload}
                  disabled={!selectedImage || uploading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload Image"}
                </button>

                {selectedImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setPreviewImage("");
                      setImageError("");
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {selectedImage && (
                <p className="mt-3 break-all text-xs text-gray-500">
                  Selected: {selectedImage.name}
                </p>
              )}

              {imageError && (
                <p role="alert" className="mt-3 text-sm text-red-600">
                  {imageError}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Account Information */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Account Information
          </h2>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">User ID</p>
              <p className="mt-1 break-all font-medium text-gray-800">
                {profile.id}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Role</p>
              <p className="mt-1 font-medium capitalize text-gray-800">
                {profile.role || "USER"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 sm:col-span-2">
              <p className="text-sm text-gray-500">Account Status</p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  profile.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {profile.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-5">
            <div>
              <label
                htmlFor="profile-name"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={100}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Email Address
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </section>

        {/* Change Password */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">
            Change Password
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            Choose a strong password with at least 8 characters.
          </p>

          <form onSubmit={handlePasswordChange} className="space-y-5">
            <div>
              <label
                htmlFor="current-password"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword || !currentPassword || !newPassword}
              className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {changingPassword ? "Updating Password..." : "Change Password"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

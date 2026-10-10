import { useQuery } from "@apollo/client/react";
import { Navigate, Outlet } from "react-router-dom";
import { GET_ME } from "../graphql/queries";

export default function ProtectedRoute() {
  const { loading, error, data } = useQuery(GET_ME, {
    fetchPolicy: "network-only",
    errorPolicy: "all",
  });

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p>Checking your session...</p>
      </div>
    );
  }

  return !error && data?.me ? <Outlet /> : <Navigate to="/login" replace />;
}

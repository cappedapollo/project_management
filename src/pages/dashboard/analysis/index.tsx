import { Navigate } from "react-router";

// Redirect to the correct analytics page
export default function Analysis() {
	return <Navigate to="/dashboard/analytics" replace />;
}

import { Navigate } from "react-router";

// Redirect to the correct interview list page
export default function UserInterview() {
	return <Navigate to="/dashboard/interviews" replace />;
}

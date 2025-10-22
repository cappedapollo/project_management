import { useAuth } from "@/components/auth/use-auth";
import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";
import type React from "react";

interface AdminGuardProps {
	children: React.ReactNode;
}

/**
 * Admin Guard Component
 * Only allows users with admin role (role = 0) to access the wrapped content
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
	const { user, isAuthenticated } = useAuth();
	const navigate = useNavigate();

	// If not authenticated, redirect to login (handled by LoginAuthGuard)
	if (!isAuthenticated) {
		return null;
	}

	// If user is not admin (role !== 0), show access denied
	if (user?.role !== 0) {
		return (
			<div style={{ padding: "50px", textAlign: "center" }}>
				<Result
					status="403"
					title="403"
					subTitle="Sorry, you are not authorized to access this page. Admin privileges required."
					extra={
						<Button type="primary" onClick={() => navigate("/dashboard")}>
							Back to Dashboard
						</Button>
					}
				/>
			</div>
		);
	}

	// User is admin, render children
	return <>{children}</>;
};

export default AdminGuard;

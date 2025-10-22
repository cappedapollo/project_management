import { Icon } from "@/components/icon";
import { useAuth } from "@/components/auth/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Badge } from "@/ui/badge";
import { Text, Title } from "@/ui/typography";
import { Form, Select, Switch, InputNumber, Space, message, Tabs, Divider, Alert, Modal } from "antd";
import { useEffect, useState } from "react";

const { Option } = Select;
const { TabPane } = Tabs;

interface SystemSettings {
	general: {
		site_name: string;
		site_description: string;
		site_url: string;
		admin_email: string;
		timezone: string;
		date_format: string;
		time_format: string;
		language: string;
	};
	security: {
		password_min_length: number;
		password_require_uppercase: boolean;
		password_require_lowercase: boolean;
		password_require_numbers: boolean;
		password_require_symbols: boolean;
		session_timeout: number;
		max_login_attempts: number;
		lockout_duration: number;
		two_factor_auth_required: boolean;
		ip_whitelist_enabled: boolean;
		ip_whitelist: string[];
	};
	email: {
		smtp_host: string;
		smtp_port: number;
		smtp_username: string;
		smtp_password: string;
		smtp_encryption: string;
		from_email: string;
		from_name: string;
		email_notifications_enabled: boolean;
		welcome_email_enabled: boolean;
		password_reset_email_enabled: boolean;
	};
	storage: {
		max_file_size: number;
		allowed_file_types: string[];
		storage_provider: string;
		storage_path: string;
		auto_backup_enabled: boolean;
		backup_frequency: string;
		backup_retention_days: number;
	};
	api: {
		rate_limit_enabled: boolean;
		rate_limit_requests: number;
		rate_limit_window: number;
		api_key_required: boolean;
		cors_enabled: boolean;
		cors_origins: string[];
		webhook_enabled: boolean;
		webhook_url: string;
		webhook_secret: string;
	};
	maintenance: {
		maintenance_mode: boolean;
		maintenance_message: string;
		allowed_ips: string[];
		scheduled_maintenance: string;
		auto_updates_enabled: boolean;
		backup_before_update: boolean;
	};
}

const AdminSettingsPage: React.FC = () => {
	const { user, access_token } = useAuth();
	const [settings, setSettings] = useState<SystemSettings | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [activeTab, setActiveTab] = useState("general");
	const [testEmailModal, setTestEmailModal] = useState(false);
	const [backupModal, setBackupModal] = useState(false);
	const [form] = Form.useForm();

	useEffect(() => {
		if (user?.role === 0) {
			fetchSettings();
		}
	}, [user]);

	const fetchSettings = async () => {
		try {
			const response = await fetch("/api/admin/settings", {
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				const data = await response.json();
				setSettings(data.settings);
				form.setFieldsValue(data.settings);
			}
		} catch (error) {
			console.error("Error fetching settings:", error);
		} finally {
			setLoading(false);
		}
	};

	const saveSettings = async (values: any) => {
		setSaving(true);
		try {
			const response = await fetch("/api/admin/settings", {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(values),
			});

			if (response.ok) {
				message.success("Settings saved successfully");
				setSettings(values);
			} else {
				message.error("Failed to save settings");
			}
		} catch (error) {
			console.error("Error saving settings:", error);
			message.error("Error saving settings");
		} finally {
			setSaving(false);
		}
	};

	const testEmailConfiguration = async () => {
		try {
			const response = await fetch("/api/admin/test-email", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				message.success("Test email sent successfully");
			} else {
				message.error("Failed to send test email");
			}
		} catch (error) {
			console.error("Error testing email:", error);
			message.error("Error testing email configuration");
		}
	};

	const createBackup = async () => {
		try {
			const response = await fetch("/api/admin/create-backup", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				const data = await response.json();
				message.success(`Backup created successfully: ${data.backup_file}`);
			} else {
				message.error("Failed to create backup");
			}
		} catch (error) {
			console.error("Error creating backup:", error);
			message.error("Error creating backup");
		}
	};

	const clearCache = async () => {
		try {
			const response = await fetch("/api/admin/clear-cache", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${access_token}`,
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				message.success("Cache cleared successfully");
			} else {
				message.error("Failed to clear cache");
			}
		} catch (error) {
			console.error("Error clearing cache:", error);
			message.error("Error clearing cache");
		}
	};

	const GeneralTab = () => (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Site Information</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Form.Item name={["general", "site_name"]} label="Site Name" rules={[{ required: true }]}>
							<Input placeholder="Project Management System" />
						</Form.Item>
						<Form.Item name={["general", "admin_email"]} label="Admin Email" rules={[{ required: true, type: "email" }]}>
							<Input placeholder="admin@example.com" />
						</Form.Item>
						<Form.Item name={["general", "site_url"]} label="Site URL" rules={[{ required: true }]}>
							<Input placeholder="https://your-domain.com" />
						</Form.Item>
						<Form.Item name={["general", "timezone"]} label="Timezone" rules={[{ required: true }]}>
							<Select placeholder="Select timezone">
								<Option value="UTC">UTC</Option>
								<Option value="America/New_York">Eastern Time</Option>
								<Option value="America/Chicago">Central Time</Option>
								<Option value="America/Denver">Mountain Time</Option>
								<Option value="America/Los_Angeles">Pacific Time</Option>
								<Option value="Europe/London">London</Option>
								<Option value="Europe/Paris">Paris</Option>
								<Option value="Asia/Tokyo">Tokyo</Option>
							</Select>
						</Form.Item>
						<Form.Item name={["general", "date_format"]} label="Date Format">
							<Select>
								<Option value="MM/DD/YYYY">MM/DD/YYYY</Option>
								<Option value="DD/MM/YYYY">DD/MM/YYYY</Option>
								<Option value="YYYY-MM-DD">YYYY-MM-DD</Option>
							</Select>
						</Form.Item>
						<Form.Item name={["general", "time_format"]} label="Time Format">
							<Select>
								<Option value="12">12 Hour</Option>
								<Option value="24">24 Hour</Option>
							</Select>
						</Form.Item>
					</div>
					<Form.Item name={["general", "site_description"]} label="Site Description">
						<Textarea rows={3} placeholder="A comprehensive project management and job search platform" />
					</Form.Item>
				</CardContent>
			</Card>
		</div>
	);

	const SecurityTab = () => (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Password Policy</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Form.Item name={["security", "password_min_length"]} label="Minimum Password Length">
							<InputNumber min={6} max={50} />
						</Form.Item>
						<Form.Item name={["security", "max_login_attempts"]} label="Max Login Attempts">
							<InputNumber min={3} max={10} />
						</Form.Item>
						<Form.Item name={["security", "session_timeout"]} label="Session Timeout (minutes)">
							<InputNumber min={15} max={1440} />
						</Form.Item>
						<Form.Item name={["security", "lockout_duration"]} label="Lockout Duration (minutes)">
							<InputNumber min={5} max={60} />
						</Form.Item>
					</div>
					<Divider />
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Form.Item name={["security", "password_require_uppercase"]} valuePropName="checked">
							<Switch checkedChildren="Require Uppercase" unCheckedChildren="No Uppercase Required" />
						</Form.Item>
						<Form.Item name={["security", "password_require_lowercase"]} valuePropName="checked">
							<Switch checkedChildren="Require Lowercase" unCheckedChildren="No Lowercase Required" />
						</Form.Item>
						<Form.Item name={["security", "password_require_numbers"]} valuePropName="checked">
							<Switch checkedChildren="Require Numbers" unCheckedChildren="No Numbers Required" />
						</Form.Item>
						<Form.Item name={["security", "password_require_symbols"]} valuePropName="checked">
							<Switch checkedChildren="Require Symbols" unCheckedChildren="No Symbols Required" />
						</Form.Item>
						<Form.Item name={["security", "two_factor_auth_required"]} valuePropName="checked">
							<Switch checkedChildren="2FA Required" unCheckedChildren="2FA Optional" />
						</Form.Item>
						<Form.Item name={["security", "ip_whitelist_enabled"]} valuePropName="checked">
							<Switch checkedChildren="IP Whitelist Enabled" unCheckedChildren="IP Whitelist Disabled" />
						</Form.Item>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	const EmailTab = () => (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span>SMTP Configuration</span>
						<Button onClick={testEmailConfiguration}>
							<Icon icon="solar:letter-bold" size={16} className="mr-1" />
							Test Email
						</Button>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Form.Item name={["email", "smtp_host"]} label="SMTP Host" rules={[{ required: true }]}>
							<Input placeholder="smtp.gmail.com" />
						</Form.Item>
						<Form.Item name={["email", "smtp_port"]} label="SMTP Port" rules={[{ required: true }]}>
							<InputNumber min={1} max={65535} placeholder={587} />
						</Form.Item>
						<Form.Item name={["email", "smtp_username"]} label="SMTP Username" rules={[{ required: true }]}>
							<Input placeholder="your-email@gmail.com" />
						</Form.Item>
						<Form.Item name={["email", "smtp_password"]} label="SMTP Password" rules={[{ required: true }]}>
							<Input.Password placeholder="Your SMTP password" />
						</Form.Item>
						<Form.Item name={["email", "smtp_encryption"]} label="Encryption">
							<Select>
								<Option value="tls">TLS</Option>
								<Option value="ssl">SSL</Option>
								<Option value="none">None</Option>
							</Select>
						</Form.Item>
						<Form.Item name={["email", "from_name"]} label="From Name">
							<Input placeholder="Project Management System" />
						</Form.Item>
					</div>
					<Form.Item name={["email", "from_email"]} label="From Email" rules={[{ required: true, type: "email" }]}>
						<Input placeholder="noreply@your-domain.com" />
					</Form.Item>
					<Divider />
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Form.Item name={["email", "email_notifications_enabled"]} valuePropName="checked">
							<Switch checkedChildren="Email Notifications On" unCheckedChildren="Email Notifications Off" />
						</Form.Item>
						<Form.Item name={["email", "welcome_email_enabled"]} valuePropName="checked">
							<Switch checkedChildren="Welcome Emails On" unCheckedChildren="Welcome Emails Off" />
						</Form.Item>
						<Form.Item name={["email", "password_reset_email_enabled"]} valuePropName="checked">
							<Switch checkedChildren="Password Reset Emails On" unCheckedChildren="Password Reset Emails Off" />
						</Form.Item>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	const StorageTab = () => (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>File Storage Settings</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Form.Item name={["storage", "max_file_size"]} label="Max File Size (MB)">
							<InputNumber min={1} max={100} />
						</Form.Item>
						<Form.Item name={["storage", "storage_provider"]} label="Storage Provider">
							<Select>
								<Option value="local">Local Storage</Option>
								<Option value="aws_s3">Amazon S3</Option>
								<Option value="google_cloud">Google Cloud Storage</Option>
								<Option value="azure">Azure Blob Storage</Option>
							</Select>
						</Form.Item>
						<Form.Item name={["storage", "backup_frequency"]} label="Backup Frequency">
							<Select>
								<Option value="daily">Daily</Option>
								<Option value="weekly">Weekly</Option>
								<Option value="monthly">Monthly</Option>
							</Select>
						</Form.Item>
						<Form.Item name={["storage", "backup_retention_days"]} label="Backup Retention (days)">
							<InputNumber min={7} max={365} />
						</Form.Item>
					</div>
					<Form.Item name={["storage", "storage_path"]} label="Storage Path">
						<Input placeholder="/uploads" />
					</Form.Item>
					<Divider />
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Form.Item name={["storage", "auto_backup_enabled"]} valuePropName="checked">
							<Switch checkedChildren="Auto Backup On" unCheckedChildren="Auto Backup Off" />
						</Form.Item>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	const MaintenanceTab = () => (
		<div className="space-y-6">
			<Alert
				message="Maintenance Mode"
				description="When maintenance mode is enabled, only administrators can access the system."
				type="warning"
				showIcon
				className="mb-4"
			/>
			<Card>
				<CardHeader>
					<CardTitle>Maintenance Settings</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<Form.Item name={["maintenance", "maintenance_mode"]} valuePropName="checked">
							<Switch checkedChildren="Maintenance Mode ON" unCheckedChildren="Maintenance Mode OFF" size="default" />
						</Form.Item>
						<Form.Item name={["maintenance", "maintenance_message"]} label="Maintenance Message">
							<Textarea rows={3} placeholder="We are currently performing scheduled maintenance. Please check back later." />
						</Form.Item>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<Form.Item name={["maintenance", "auto_updates_enabled"]} valuePropName="checked">
								<Switch checkedChildren="Auto Updates On" unCheckedChildren="Auto Updates Off" />
							</Form.Item>
							<Form.Item name={["maintenance", "backup_before_update"]} valuePropName="checked">
								<Switch checkedChildren="Backup Before Update" unCheckedChildren="No Backup Before Update" />
							</Form.Item>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>System Maintenance</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Button onClick={createBackup} block>
							<Icon icon="solar:database-bold" size={16} className="mr-1" />
							Create Backup
						</Button>
						<Button onClick={clearCache} block>
							<Icon icon="solar:refresh-bold" size={16} className="mr-1" />
							Clear Cache
						</Button>
						<Button onClick={() => setBackupModal(true)} block>
							<Icon icon="solar:download-bold" size={16} className="mr-1" />
							Download Logs
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);

	if (user?.role !== 0) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="text-center">
						<Icon icon="solar:shield-cross-bold" size={48} className="mx-auto mb-4 text-red-500" />
						<Title level={3}>Access Denied</Title>
						<Text>You don't have permission to access this page.</Text>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="p-6">
			<div className="flex justify-between items-center mb-6">
				<div>
					<Title level={2} className="flex items-center gap-2">
						<Icon icon="solar:settings-bold" size={24} />
						System Settings
					</Title>
					<Text className="text-gray-600">Configure system-wide settings and preferences</Text>
				</div>
				<Button type="primary" onClick={() => form.submit()} loading={saving}>
					<Icon icon="solar:diskette-bold" size={16} className="mr-1" />
					Save Settings
				</Button>
			</div>

			<Form form={form} layout="vertical" onFinish={saveSettings} initialValues={settings}>
				<Card>
					<CardContent>
						<Tabs activeKey={activeTab} onChange={setActiveTab}>
							<TabPane
								tab={
									<span>
										<Icon icon="solar:settings-bold" size={16} className="mr-1" />
										General
									</span>
								}
								key="general"
							>
								<GeneralTab />
							</TabPane>
							<TabPane
								tab={
									<span>
										<Icon icon="solar:shield-check-bold" size={16} className="mr-1" />
										Security
									</span>
								}
								key="security"
							>
								<SecurityTab />
							</TabPane>
							<TabPane
								tab={
									<span>
										<Icon icon="solar:letter-bold" size={16} className="mr-1" />
										Email
									</span>
								}
								key="email"
							>
								<EmailTab />
							</TabPane>
							<TabPane
								tab={
									<span>
										<Icon icon="solar:database-bold" size={16} className="mr-1" />
										Storage
									</span>
								}
								key="storage"
							>
								<StorageTab />
							</TabPane>
							<TabPane
								tab={
									<span>
										<Icon icon="solar:tools-bold" size={16} className="mr-1" />
										Maintenance
									</span>
								}
								key="maintenance"
							>
								<MaintenanceTab />
							</TabPane>
						</Tabs>
					</CardContent>
				</Card>
			</Form>
		</div>
	);
};

export default AdminSettingsPage;

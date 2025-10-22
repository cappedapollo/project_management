import type { ProposalInfo } from "@/types/entity";
import { Button, Form, Input, Modal, message } from "antd";
import { useState } from "react";

export interface SimpleJobApplicationModalProps {
	formValue: ProposalInfo;
	title: string;
	show: boolean;
	onOk: (values: ProposalInfo) => void;
	onCancel: () => void;
}

export default function SimpleJobApplicationModal({ title, show, formValue, onOk, onCancel }: SimpleJobApplicationModalProps) {
	const [form] = Form.useForm();
	const [loading, setLoading] = useState(false);

	const handleSubmit = async () => {
		try {
			setLoading(true);
			const values = await form.validateFields();
			onOk(values);
			form.resetFields();
		} catch (error) {
			console.error("Form validation failed:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleCancel = () => {
		form.resetFields();
		onCancel();
	};

	return (
		<Modal title={title} open={show} onOk={handleSubmit} onCancel={handleCancel} confirmLoading={loading} width={600}>
			<Form form={form} layout="vertical" initialValues={formValue}>
				<Form.Item name="company" label="Company" rules={[{ required: true, message: "Please enter company name" }]}>
					<Input placeholder="Enter company name" />
				</Form.Item>

				<Form.Item name="job_description" label="Position Title" rules={[{ required: true, message: "Please enter position title" }]}>
					<Input placeholder="Enter position title" />
				</Form.Item>

				<Form.Item name="job_link" label="Job Link">
					<Input placeholder="Enter job posting URL" />
				</Form.Item>

				<Form.Item name="cover_letter" label="Cover Letter">
					<Input.TextArea rows={4} placeholder="Enter your cover letter" />
				</Form.Item>
			</Form>
		</Modal>
	);
}

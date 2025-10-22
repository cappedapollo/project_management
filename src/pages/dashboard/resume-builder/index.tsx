import { useAuth } from "@/components/auth/use-auth";
import Icon from "@/components/icon/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Text, Title } from "@/ui/typography";
import { DatePicker, Divider, Form, Modal, Select, Space, Tabs, message } from "antd";
import React, { useEffect, useState, useCallback } from "react";

const { Option } = Select;

interface ResumeSection {
	id: string;
	type: "personal" | "experience" | "education" | "skills";
	title: string;
	content: any;
	order: number;
}

interface ResumeTemplate {
	id: string;
	name: string;
	description: string;
	category: string;
	color: string;
}

interface ResumeData {
	title: string;
	template_id: string;
	sections: ResumeSection[];
	settings: {
		fontSize: number;
		colorScheme: string;
		spacing: string;
		font: string;
	};
}

// Separate PersonalInfoForm component
const PersonalInfoForm = React.memo(
	({
		personalContent,
		onUpdate,
	}: {
		personalContent: any;
		onUpdate: (field: string, value: string) => void;
	}) => {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Icon icon="mdi:account" size={20} />
						Personal Information
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label htmlFor="fullName" className="block text-sm font-medium mb-1">
									Full Name
								</label>
								<Input id="fullName" value={personalContent.fullName || ""} onChange={(e) => onUpdate("fullName", e.target.value)} placeholder="John Doe" />
							</div>
							<div>
								<label htmlFor="email" className="block text-sm font-medium mb-1">
									Email
								</label>
								<Input
									id="email"
									type="email"
									value={personalContent.email || ""}
									onChange={(e) => onUpdate("email", e.target.value)}
									placeholder="john@example.com"
								/>
							</div>
							<div>
								<label htmlFor="phone" className="block text-sm font-medium mb-1">
									Phone
								</label>
								<Input id="phone" value={personalContent.phone || ""} onChange={(e) => onUpdate("phone", e.target.value)} placeholder="+1 (555) 123-4567" />
							</div>
							<div>
								<label htmlFor="location" className="block text-sm font-medium mb-1">
									Location
								</label>
								<Input id="location" value={personalContent.location || ""} onChange={(e) => onUpdate("location", e.target.value)} placeholder="New York, NY" />
							</div>
						</div>
						<div>
							<label htmlFor="summary" className="block text-sm font-medium mb-1">
								Professional Summary
							</label>
							<Textarea
								id="summary"
								rows={4}
								value={personalContent.summary || ""}
								onChange={(e) => onUpdate("summary", e.target.value)}
								placeholder="Brief professional summary highlighting your key skills and experience..."
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	},
);

// Separate ExperienceForm component
const ExperienceForm = React.memo(
	({
		experienceContent,
		onUpdate,
		onAdd,
	}: {
		experienceContent: any[];
		onUpdate: (content: any[]) => void;
		onAdd: () => void;
	}) => {
		const updateExperience = useCallback(
			(index: number, field: string, value: string) => {
				const updatedContent = [...experienceContent];
				updatedContent[index] = { ...updatedContent[index], [field]: value };
				onUpdate(updatedContent);
			},
			[experienceContent, onUpdate],
		);

		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Icon icon="mdi:briefcase" size={20} />
							Work Experience
						</div>
						<Button onClick={onAdd} size="sm">
							<Icon icon="mdi:plus" size={16} className="mr-1" />
							Add Experience
						</Button>
					</CardTitle>
				</CardHeader>
				<CardContent>
					{experienceContent.length === 0 ? (
						<Text className="text-gray-600">No work experience added yet. Click "Add Experience" to get started.</Text>
					) : (
						<div className="space-y-4">
							{experienceContent.map((exp: any, index: number) => (
								<Card key={exp.id} className="border-l-4 border-l-blue-500">
									<CardContent className="pt-4">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<label htmlFor={`company-${index}`} className="block text-sm font-medium mb-1">
													Company
												</label>
												<Input
													id={`company-${index}`}
													value={exp.company || ""}
													onChange={(e) => updateExperience(index, "company", e.target.value)}
													placeholder="Company Name"
												/>
											</div>
											<div>
												<label htmlFor={`position-${index}`} className="block text-sm font-medium mb-1">
													Position
												</label>
												<Input
													id={`position-${index}`}
													value={exp.position || ""}
													onChange={(e) => updateExperience(index, "position", e.target.value)}
													placeholder="Job Title"
												/>
											</div>
										</div>
										<div className="mt-4">
											<label htmlFor={`description-${index}`} className="block text-sm font-medium mb-1">
												Description
											</label>
											<Textarea
												id={`description-${index}`}
												rows={3}
												value={exp.description || ""}
												onChange={(e) => updateExperience(index, "description", e.target.value)}
												placeholder="Describe your role and achievements..."
											/>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		);
	},
);

// Separate TemplateSelector component
const TemplateSelector = React.memo(
	({
		templates,
		selectedTemplateId,
		onSelect,
	}: {
		templates: ResumeTemplate[];
		selectedTemplateId: string;
		onSelect: (templateId: string) => void;
	}) => (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Icon icon="mdi:palette" size={20} />
					Choose Template
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{templates.map((template) => (
						<Card
							key={template.id}
							className={`cursor-pointer transition-all hover:shadow-md ${selectedTemplateId === template.id ? "ring-2 ring-blue-500" : ""}`}
							onClick={() => onSelect(template.id)}
						>
							<CardContent className="p-4">
								<div className="flex items-center gap-3">
									<div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${template.color}20` }}>
										<Icon icon="mdi:file-document" size={24} style={{ color: template.color }} />
									</div>
									<div className="flex-1">
										<h3 className="font-semibold">{template.name}</h3>
										<p className="text-sm text-gray-600">{template.description}</p>
										<Badge variant="secondary" className="mt-1">
											{template.category}
										</Badge>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</CardContent>
		</Card>
	),
);

// Separate ResumePreview component
const ResumePreview = React.memo(
	({
		personalContent,
		experienceContent,
	}: {
		personalContent: any;
		experienceContent: any[];
	}) => {
		return (
			<Card className="h-full">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Icon icon="mdi:eye" size={20} />
						Preview
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="bg-white border rounded-lg p-6 min-h-[600px] shadow-sm">
						{personalContent.fullName ? (
							<div className="space-y-6">
								{/* Header */}
								<div className="text-center border-b pb-4">
									<h1 className="text-2xl font-bold text-gray-900">{personalContent.fullName}</h1>
									<div className="flex flex-wrap justify-center gap-4 mt-2 text-sm text-gray-600">
										{personalContent.email && <span>{personalContent.email}</span>}
										{personalContent.phone && <span>{personalContent.phone}</span>}
										{personalContent.location && <span>{personalContent.location}</span>}
									</div>
								</div>

								{/* Summary */}
								{personalContent.summary && (
									<div>
										<h2 className="text-lg font-semibold text-gray-900 mb-2">Professional Summary</h2>
										<p className="text-gray-700 leading-relaxed">{personalContent.summary}</p>
									</div>
								)}

								{/* Experience */}
								{experienceContent.length > 0 && (
									<div>
										<h2 className="text-lg font-semibold text-gray-900 mb-3">Work Experience</h2>
										<div className="space-y-4">
											{experienceContent.map((exp: any) => (
												<div key={exp.id} className="border-l-2 border-blue-500 pl-4">
													<div className="flex justify-between items-start">
														<div>
															<h3 className="font-semibold text-gray-900">{exp.position}</h3>
															<p className="text-blue-600 font-medium">{exp.company}</p>
														</div>
													</div>
													{exp.description && <p className="text-gray-700 mt-2 leading-relaxed">{exp.description}</p>}
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						) : (
							<div className="flex items-center justify-center h-full text-gray-500">
								<div className="text-center">
									<Icon icon="mdi:file-document-outline" size={48} className="mx-auto mb-4 opacity-50" />
									<p>Start filling out your information to see the preview</p>
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		);
	},
);

const ResumeBuilderPage: React.FC = () => {
	const { user, access_token } = useAuth();
	const [resumeData, setResumeData] = useState<ResumeData>({
		title: "My Resume",
		template_id: "modern-1",
		sections: [],
		settings: {
			fontSize: 12,
			colorScheme: "blue",
			spacing: "normal",
			font: "Arial",
		},
	});
	const [activeTab, setActiveTab] = useState("personal");
	const [saving, setSaving] = useState(false);

	// Sample templates
	const templates: ResumeTemplate[] = [
		{
			id: "modern-1",
			name: "Modern Professional",
			description: "Clean, modern design perfect for tech and business roles",
			category: "modern",
			color: "#2563eb",
		},
		{
			id: "classic-1",
			name: "Classic Traditional",
			description: "Traditional format ideal for conservative industries",
			category: "classic",
			color: "#1f2937",
		},
		{
			id: "creative-1",
			name: "Creative Designer",
			description: "Eye-catching design for creative professionals",
			category: "creative",
			color: "#7c3aed",
		},
		{
			id: "minimal-1",
			name: "Minimal Clean",
			description: "Simple, clean layout focusing on content",
			category: "minimal",
			color: "#059669",
		},
	];

	useEffect(() => {
		initializeDefaultSections();
	}, []);

	const initializeDefaultSections = () => {
		const defaultSections: ResumeSection[] = [
			{
				id: "personal",
				type: "personal",
				title: "Personal Information",
				order: 1,
				content: {
					fullName: "",
					email: "",
					phone: "",
					location: "",
					website: "",
					linkedin: "",
					summary: "",
				},
			},
			{
				id: "experience",
				type: "experience",
				title: "Work Experience",
				order: 2,
				content: [],
			},
			{
				id: "education",
				type: "education",
				title: "Education",
				order: 3,
				content: [],
			},
			{
				id: "skills",
				type: "skills",
				title: "Skills",
				order: 4,
				content: {
					technical: [],
					soft: [],
					languages: [],
				},
			},
		];
		setResumeData((prev) => ({ ...prev, sections: defaultSections }));
	};

	// Stable callback functions
	const updatePersonalField = useCallback((field: string, value: string) => {
		setResumeData((prev) => ({
			...prev,
			sections: prev.sections.map((section) => (section.id === "personal" ? { ...section, content: { ...section.content, [field]: value } } : section)),
		}));
	}, []);

	const updateExperienceContent = useCallback((content: any[]) => {
		setResumeData((prev) => ({
			...prev,
			sections: prev.sections.map((section) => (section.id === "experience" ? { ...section, content } : section)),
		}));
	}, []);

	const addExperience = useCallback(() => {
		const newExperience = {
			id: Date.now().toString(),
			company: "",
			position: "",
			location: "",
			startDate: null,
			endDate: null,
			current: false,
			description: "",
			achievements: [],
		};

		setResumeData((prev) => ({
			...prev,
			sections: prev.sections.map((section) => (section.id === "experience" ? { ...section, content: [...section.content, newExperience] } : section)),
		}));
	}, []);

	const selectTemplate = useCallback((templateId: string) => {
		setResumeData((prev) => ({ ...prev, template_id: templateId }));
	}, []);

	const saveResume = useCallback(async () => {
		setSaving(true);
		try {
			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1000));
			message.success("Resume saved successfully!");
		} catch (error) {
			message.error("Error saving resume");
		} finally {
			setSaving(false);
		}
	}, []);

	const exportToPDF = useCallback(async () => {
		try {
			message.info("PDF export feature coming soon!");
		} catch (error) {
			message.error("Error exporting to PDF");
		}
	}, []);

	// Get section content
	const personalSection = resumeData.sections.find((s) => s.type === "personal");
	const experienceSection = resumeData.sections.find((s) => s.type === "experience");

	return (
		<div className="p-6">
			<div className="flex justify-between items-center mb-6">
				<div>
					<Title as="h2" className="flex items-center gap-2">
						<Icon icon="mdi:file-document-plus" size={24} />
						Resume Builder
					</Title>
					<Text className="text-gray-600">Create professional resumes with our advanced builder</Text>
				</div>
				<Space>
					<Button onClick={exportToPDF} variant="outline">
						<Icon icon="mdi:download" size={16} className="mr-1" />
						Export PDF
					</Button>
					<Button onClick={saveResume} disabled={saving}>
						{saving ? (
							<>
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
								Saving...
							</>
						) : (
							<>
								<Icon icon="mdi:content-save" size={16} className="mr-1" />
								Save Resume
							</>
						)}
					</Button>
				</Space>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div>
					<Tabs
						activeKey={activeTab}
						onChange={setActiveTab}
						items={[
							{
								key: "templates",
								label: "Templates",
								children: <TemplateSelector templates={templates} selectedTemplateId={resumeData.template_id} onSelect={selectTemplate} />,
							},
							{
								key: "personal",
								label: "Personal Info",
								children: <PersonalInfoForm personalContent={personalSection?.content || {}} onUpdate={updatePersonalField} />,
							},
							{
								key: "experience",
								label: "Experience",
								children: <ExperienceForm experienceContent={experienceSection?.content || []} onUpdate={updateExperienceContent} onAdd={addExperience} />,
							},
							{
								key: "education",
								label: "Education",
								children: (
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Icon icon="mdi:school" size={20} />
												Education
											</CardTitle>
										</CardHeader>
										<CardContent>
											<Text className="text-gray-600">Education section coming soon...</Text>
										</CardContent>
									</Card>
								),
							},
						]}
					/>
				</div>
				<div>
					<ResumePreview personalContent={personalSection?.content || {}} experienceContent={experienceSection?.content || []} />
				</div>
			</div>
		</div>
	);
};

export default ResumeBuilderPage;

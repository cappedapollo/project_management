import resumeService from "@/api/services/resumeService";

interface ResumeTemplate {
	id: string;
	name: string;
	company?: string;
	tags?: string[];
	content: string;
	jobDescription?: string;
	atsScore?: number;
	createdAt: string;
	updatedAt: string;
}
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Building, Clock, FileText, Loader2, Search, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ResumeTemplateSelectorProps {
	show: boolean;
	onClose: () => void;
	onSelect: (template: ResumeTemplate) => void;
	companyName?: string;
	jobDescription?: string;
}

export default function ResumeTemplateSelector({ show, onClose, onSelect, companyName, jobDescription }: ResumeTemplateSelectorProps) {
	const [templates, setTemplates] = useState<ResumeTemplate[]>([]);
	const [filteredTemplates, setFilteredTemplates] = useState<ResumeTemplate[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate | null>(null);

	useEffect(() => {
		if (show) {
			loadTemplates();
		}
	}, [show]);

	const loadTemplates = async () => {
		setLoading(true);
		try {
			// Try to load from server first, fallback to local storage
			let serverTemplates: ResumeTemplate[] = [];
			try {
				serverTemplates = await resumeService.getResumeTemplates();
			} catch (error) {
				console.log("Server templates not available, using local storage");
			}

			const localTemplates = await resumeService.getLocalResumeTemplates();
			const allTemplates = [...serverTemplates, ...localTemplates];

			// Sort by relevance if company name is provided
			if (companyName) {
				allTemplates.sort((a, b) => {
					const aRelevance = a.company?.toLowerCase().includes(companyName.toLowerCase()) ? 1 : 0;
					const bRelevance = b.company?.toLowerCase().includes(companyName.toLowerCase()) ? 1 : 0;
					return bRelevance - aRelevance;
				});
			}

			setTemplates(allTemplates);
		} catch (error) {
			console.error("Error loading templates:", error);
			toast.error("Failed to load resume templates");
		} finally {
			setLoading(false);
		}
	};

	const filterTemplates = useCallback(() => {
		let filtered = templates;

		// Filter by search query
		if (searchQuery) {
			filtered = filtered.filter(
				(template) =>
					template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					template.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
					template.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
			);
		}

		// Filter by company if provided
		if (companyName) {
			filtered = filtered.filter((template) => template.company?.toLowerCase().includes(companyName.toLowerCase()));
		}

		setFilteredTemplates(filtered);
	}, [templates, searchQuery, companyName]);

	useEffect(() => {
		filterTemplates();
	}, [filterTemplates]);

	const handleTemplateSelect = (template: ResumeTemplate) => {
		setSelectedTemplate(template);
	};

	const handleConfirmSelection = () => {
		if (selectedTemplate) {
			onSelect(selectedTemplate);
			onClose();
			setSelectedTemplate(null);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString();
	};

	const getRelevanceScore = (template: ResumeTemplate) => {
		let score = 0;

		// Company match
		if (companyName && template.company?.toLowerCase().includes(companyName.toLowerCase())) {
			score += 3;
		}

		// Job description keywords match
		if (jobDescription && template.jobDescription) {
			const jobKeywords = jobDescription.toLowerCase().split(/\s+/);
			const templateKeywords = template.jobDescription.toLowerCase().split(/\s+/);
			const matches = jobKeywords.filter((keyword) => templateKeywords.some((templateKeyword: string) => templateKeyword.includes(keyword)));
			score += matches.length * 0.5;
		}

		// ATS score
		if (template.atsScore) {
			score += template.atsScore / 20; // Normalize ATS score
		}

		return Math.min(score, 5); // Cap at 5 stars
	};

	return (
		<Dialog open={show} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						Select Resume Template
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					{/* Search and Filter */}
					<div className="flex gap-2">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								placeholder="Search resumes by name, company, or tags..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10"
							/>
						</div>
						{companyName && (
							<Badge variant="secondary" className="flex items-center gap-1">
								<Building className="h-3 w-3" />
								{companyName}
							</Badge>
						)}
					</div>

					{/* Templates Grid */}
					{loading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin" />
							<span className="ml-2">Loading templates...</span>
						</div>
					) : filteredTemplates.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							<FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
							<p>No resume templates found</p>
							{searchQuery && <p className="text-sm">Try adjusting your search criteria</p>}
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{filteredTemplates.map((template) => {
								const relevanceScore = getRelevanceScore(template);
								const isSelected = selectedTemplate?.id === template.id;

								return (
									<Card
										key={template.id}
										className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}
										onClick={() => handleTemplateSelect(template)}
									>
										<CardHeader className="pb-3">
											<div className="flex items-start justify-between">
												<CardTitle className="text-lg">{template.name}</CardTitle>
												<div className="flex items-center gap-1">
													{Array.from({ length: 5 }, (_, i) => (
														<Star
															key={`star-${i}-${relevanceScore}`}
															className={`h-4 w-4 ${i < relevanceScore ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
														/>
													))}
												</div>
											</div>
										</CardHeader>
										<CardContent className="space-y-3">
											{template.company && (
												<div className="flex items-center gap-2 text-sm text-gray-600">
													<Building className="h-4 w-4" />
													{template.company}
												</div>
											)}

											<div className="flex items-center gap-2 text-sm text-gray-600">
												<Clock className="h-4 w-4" />
												{formatDate(template.updatedAt)}
											</div>

											{template.atsScore && (
												<div className="flex items-center gap-2">
													<Badge variant="outline" className="text-xs">
														ATS Score: {template.atsScore}/100
													</Badge>
												</div>
											)}

											{template.tags && template.tags.length > 0 && (
												<div className="flex flex-wrap gap-1">
													{template.tags.slice(0, 3).map((tag: string) => (
														<Badge key={tag} variant="secondary" className="text-xs">
															{tag}
														</Badge>
													))}
													{template.tags.length > 3 && (
														<Badge variant="secondary" className="text-xs">
															+{template.tags.length - 3} more
														</Badge>
													)}
												</div>
											)}

											<div className="text-sm text-gray-500 line-clamp-2">{template.content.substring(0, 150)}...</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					)}

					{/* Selection Summary */}
					{selectedTemplate && (
						<div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
							<h4 className="font-medium text-blue-900 mb-2">Selected Template</h4>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-blue-800 font-medium">{selectedTemplate.name}</p>
									{selectedTemplate.company && <p className="text-blue-600 text-sm">{selectedTemplate.company}</p>}
								</div>
								<Button onClick={handleConfirmSelection} size="sm">
									Use This Template
								</Button>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

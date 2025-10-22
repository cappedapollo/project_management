import type { SavedResume } from "@/api/services/resumeService";
import { Icon } from "@/components/icon";
import { useDeleteSavedResume, useGetSavedResumeList } from "@/store/savedResumeStore";
import { useUserInfo } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Copy, Eye, Loader2, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export type SavedResumesModalProps = {
	show: boolean;
	onClose: VoidFunction;
	onSelectResume: (resume: SavedResume) => void;
	profileId: string;
};

export default function SavedResumesModal({ show, onClose, onSelectResume, profileId }: SavedResumesModalProps) {
	const userInfo = useUserInfo();
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedResume, setSelectedResume] = useState<SavedResume | null>(null);

	const { getSavedResumeList, isLoading, data } = useGetSavedResumeList({
		userId: userInfo.id,
		profileId,
	});

	const { deleteSavedResume, isLoading: isDeleting } = useDeleteSavedResume();

	useEffect(() => {
		if (show && userInfo.id) {
			getSavedResumeList();
		}
	}, [show, userInfo.id, getSavedResumeList]);

	const handleDeleteResume = async (resumeId: string) => {
		try {
			await deleteSavedResume(resumeId);
			getSavedResumeList();
		} catch (error) {
			console.error("Error deleting resume:", error);
		}
	};

	const handleSelectResume = (resume: SavedResume) => {
		setSelectedResume(resume);
	};

	const handleConfirmSelection = () => {
		if (selectedResume) {
			onSelectResume(selectedResume);
			onClose();
		}
	};

	const handleCopyResume = async (resume: SavedResume) => {
		try {
			await navigator.clipboard.writeText(resume.modified_resume);
			toast.success("Resume content copied to clipboard");
		} catch (error) {
			toast.error("Failed to copy resume content");
		}
	};

	const filteredResumes =
		data?.savedResumes?.filter((resume: any) => {
			const searchLower = searchTerm.toLowerCase();
			return (
				resume.company?.toLowerCase().includes(searchLower) ||
				resume.job_description.toLowerCase().includes(searchLower) ||
				resume.modified_resume.toLowerCase().includes(searchLower)
			);
		}) || [];

	return (
		<Dialog open={show} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="!w-[90vw] !h-[90vh] !max-w-none !max-h-none overflow-hidden flex flex-col">
				<DialogHeader className="flex-shrink-0">
					<DialogTitle>Saved Resumes</DialogTitle>
					<div className="text-sm text-gray-500">Select a saved resume to link to your job application</div>
				</DialogHeader>

				<div className="flex-1 overflow-hidden flex flex-col gap-4">
					{/* Search Bar */}
					<div className="flex gap-2">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
							<Input
								placeholder="Search by company, job description, or resume content..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10"
							/>
						</div>
						<Button variant="outline" onClick={() => getSavedResumeList()}>
							<Icon icon="mingcute:refresh-2-line" className="mr-2 h-4 w-4" />
							Refresh
						</Button>
					</div>

					{/* Resumes List */}
					<div className="flex-1 overflow-y-auto">
						{isLoading ? (
							<div className="flex items-center justify-center h-32">
								<Loader2 className="animate-spin h-8 w-8" />
							</div>
						) : filteredResumes.length === 0 ? (
							<div className="text-center text-gray-500 py-8">{searchTerm ? "No saved resumes match your search" : "No saved resumes found"}</div>
						) : (
							<div className="grid gap-4">
								{filteredResumes.map((resume: any) => (
									<Card
										key={resume.id}
										className={`cursor-pointer transition-all ${selectedResume?.id === resume.id ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-md"}`}
										onClick={() => handleSelectResume(resume)}
									>
										<CardHeader className="pb-3">
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<CardTitle className="text-lg flex items-center gap-2">
														{resume.company || "Unknown Company"}
														{resume.company && (
															<Badge variant="secondary" className="text-xs">
																{new Date(resume.created_at).toLocaleDateString()}
															</Badge>
														)}
													</CardTitle>
													{resume.job_link && (
														<a
															href={resume.job_link}
															target="_blank"
															rel="noopener noreferrer"
															className="text-sm text-blue-600 hover:underline"
															onClick={(e) => e.stopPropagation()}
														>
															View Job Posting
														</a>
													)}
												</div>
												<div className="flex gap-2">
													<Button
														variant="ghost"
														size="sm"
														onClick={(e) => {
															e.stopPropagation();
															handleCopyResume(resume);
														}}
													>
														<Copy className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={(e) => {
															e.stopPropagation();
															handleDeleteResume(resume.id);
														}}
														disabled={isDeleting}
													>
														<Trash2 className="h-4 w-4 text-red-500" />
													</Button>
												</div>
											</div>
										</CardHeader>
										<CardContent className="pt-0">
											<div className="space-y-2">
												<div className="text-sm text-gray-600">
													<strong>Job Description:</strong>
													<div className="mt-1 max-h-20 overflow-y-auto text-xs">
														{resume.job_description.length > 200 ? `${resume.job_description.substring(0, 200)}...` : resume.job_description}
													</div>
												</div>
												<div className="text-sm text-gray-600">
													<strong>Modified Resume:</strong>
													<div className="mt-1 max-h-20 overflow-y-auto text-xs">
														{resume.modified_resume.length > 200 ? `${resume.modified_resume.substring(0, 200)}...` : resume.modified_resume}
													</div>
												</div>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						)}
					</div>
				</div>

				<DialogFooter className="flex-shrink-0">
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleConfirmSelection} disabled={!selectedResume}>
						Select Resume
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

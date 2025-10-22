import type { NavItemDataProps } from "@/components/nav/types";
import type { BasicStatus, InterviewProgress, PermissionType } from "./enum";
// Custom types for Supabase-based authentication

export interface UserToken {
	access_token?: string;
	refresh_token?: string;
}

export interface UserInfo {
	id: string;
	email?: string;
	username?: string;
	password?: string;
	avatar?: string;
	roles?: Role[];
	status?: BasicStatus;
	permissions?: Permission[];
	menu?: MenuTree[];
	summary?: string;
	country?: string;
	role?: number;

	app_metadata: any;
	user_metadata: any;
	aud: string;
	created_at: string;
}

export interface Permission_Old {
	id: string;
	parentId: string;
	name: string;
	label: string;
	type: PermissionType;
	route: string;
	status?: BasicStatus;
	order?: number;
	icon?: string;
	component?: string;
	hide?: boolean;
	hideTab?: boolean;
	frameSrc?: URL;
	newFeature?: boolean;
	children?: Permission_Old[];
}

export interface Role_Old {
	id: string;
	name: string;
	code: string;
	status: BasicStatus;
	order?: number;
	desc?: string;
	permission?: Permission_Old[];
}

export interface CommonOptions {
	status?: BasicStatus;
	desc?: string;
	createdAt?: string;
	updatedAt?: string;
}
export interface User extends CommonOptions {
	id: string; // uuid
	username: string;
	password: string;
	email: string;
	phone?: string;
	avatar?: string;
}

export interface Role extends CommonOptions {
	id: string; // uuid
	name: string;
	code: string;
}

export interface Permission extends CommonOptions {
	id: string; // uuid
	name: string;
	code: string; // resource:action  example: "user-management:read"
}

export interface Menu extends CommonOptions, MenuMetaInfo {
	id: string; // uuid
	parentId: string;
	name: string;
	code: string;
	order?: number;
	type: PermissionType;
}

export type MenuMetaInfo = Partial<Pick<NavItemDataProps, "path" | "icon" | "caption" | "info" | "disabled" | "auth" | "hidden">> & {
	externalLink?: URL;
	component?: string;
};

export type MenuTree = Menu & {
	children?: MenuTree[];
};

export interface ProfileInfo {
	id: string;
	name?: string;
	dob?: string;
	gender?: string;
	phone?: string;
	email?: string;
	job_sites?: string;
	country?: string;
	user: string | Partial<UserInfo>;
	created_at?: string;
}

export interface ProposalInfo {
	id: string;
	profile?: string;
	user: string;
	job_description?: string;
	resume?: string;
	job_link?: string;
	company?: string;
	cover_letter?: string;
	status?: string;
	resume_pdf_path?: string; // Path to the uploaded PDF resume
	saved_resume_id?: string; // ID of the linked saved resume
	applied_date?: string;
	created_at?: string;
}

export interface InterviewInfo {
	id: string;
	proposal?: string | Partial<ProposalInfo>;
	meeting_title?: string;
	meeting_link?: string;
	meeting_date?: string;
	progress?: InterviewProgress;
	job_description?: string;
	interviewer?: string;
	user?: string | Partial<UserInfo>;
	profile?: string | Partial<ProfileInfo>;
	notes?: string;
	feedback?: string;
	selected_resume_id?: string; // ID of the selected resume for this interview
	resume_link?: string; // Direct link to view the selected resume
	created_at?: string;
}

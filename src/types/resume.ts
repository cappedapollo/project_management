// Interface for structured resume data
export interface ResumeJSONData {
	name: string;
	location: string;
	email: string;
	phone: string;
	linkedin: string;
	summary: string;
	skills: {
		programming_languages: string[];
		frontend: string[];
		backend: string[];
		database: string[];
		cloud: string[];
		tools: string[];
	};
	experience: {
		title: string;
		company: string;
		duration: string;
		location: string;
		responsibilities: string[];
	}[];
	education: {
		degree: string;
		institution: string;
		location: string;
		year: string;
	};
}

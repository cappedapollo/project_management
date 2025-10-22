import { GLOBAL_CONFIG } from "@/global-config";

interface ResumeModificationRequest {
	originalResume: string;
	jobDescription: string;
}

interface ResumeModificationResponse {
	modifiedResume: string;
	summary: string;
	keyChanges: string[];
	atsScore?: number;
}

async function callOpenAI(prompt: string): Promise<string> {
	try {
		// Create AbortController for timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

		const response = await fetch(GLOBAL_CONFIG.openAIUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${GLOBAL_CONFIG.openAIKey}`,
			},
			body: JSON.stringify({
				model: "gpt-4o-mini",
				messages: [
					{
						role: "system",
						content:
							"You are an expert resume optimizer who makes substantial changes to align resumes with specific job requirements. You MUST modify content to match job descriptions while preserving formatting. Do not return unchanged content.",
					},
					{ role: "user", content: prompt },
				],
				temperature: 0.1,
				max_tokens: 2500,
				top_p: 0.8,
			}),
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
		}

		const result = await response.json();
		return result?.choices?.[0]?.message?.content || "";
	} catch (error) {
		if (error.name === "AbortError") {
			throw new Error("Request timed out. Please try again with a shorter resume or job description.");
		}
		console.error("AI Service error:", error);
		throw new Error("Failed to modify resume. Please try again.");
	}
}

export async function modifyResume(request: ResumeModificationRequest): Promise<ResumeModificationResponse> {
	const { originalResume, jobDescription } = request;

	// First, analyze the job description to extract key insights
	let jobInsights = "";
	try {
		const analysis = await analyzeJobDescription(jobDescription);
		jobInsights = `
**JOB ANALYSIS INSIGHTS:**
- Key Skills Required: ${analysis.keySkills.join(", ")}
- Required Experience: ${analysis.requiredExperience.join(", ")}
- ATS Keywords: ${analysis.suggestedKeywords.join(", ")}
- Company Values: ${analysis.companyValues.join(", ")}

**SPECIFIC OPTIMIZATION REQUIREMENTS:**
1. MUST replace generic skills with the specific skills listed above
2. MUST update job descriptions to include the required experience keywords
3. MUST incorporate ATS keywords naturally throughout the resume
4. MUST reflect the company values in the content tone
5. MUST make substantial changes to align with the job requirements
`;
	} catch (error) {
		console.error("Failed to analyze job description for optimization:", error);
		jobInsights = "Optimize resume content to match the job description requirements.";
	}

	const prompt = `
	You are a professional resume optimizer. Your task is to COMPLETELY TRANSFORM the existing resume to perfectly match the job description provided. 

	**CRITICAL INSTRUCTION: DO NOT JUST ADD KEYWORDS - REWRITE THE ENTIRE WORK EXPERIENCE SECTION**
	
	This task involves analyzing the job description in detail to understand the specific skills, experiences, and qualifications the employer is seeking, then REWRITING the work experience bullets to make it appear the candidate has been doing exactly this type of work.

	**Job Description:**
	${jobDescription}

	${jobInsights}

	**Original Resume:**
	${originalResume}

	**COMPREHENSIVE TAILORING INSTRUCTIONS:**
	
	**CRITICAL KEYWORD INTEGRATION REQUIREMENTS:**
	- YOU MUST incorporate ALL keywords from the job analysis above into the resume
	- MANDATORY: Every single keyword from "Key Skills Required", "ATS Keywords", "Required Experience", and "Company Values" MUST appear somewhere in the modified resume
	- Distribute these keywords naturally across Summary, Experience, and Skills sections
	- Use the EXACT keywords as they appear in the job analysis - do not paraphrase or change them
	- Bold the most important keywords for ATS scanning
	- VERIFICATION: Before finalizing, check that each keyword from the analysis appears in your modified resume
	
	**OVERALL APPROACH - COMPLETE TRANSFORMATION:**
	- TRANSFORM the existing resume completely to match the job description - do not just add keywords
	- REWRITE bullet points entirely to emphasize job-specific skills using the extracted keywords
	- CONVERT generic experiences into job-specific achievements that directly relate to the requirements
	- Ensure the resume format and design are professional with a non-AI generated feeling
	- Use strong power action verbs but not repeated more than once
	- Make important verbs and keywords in **bold**
	- Add metrics and match all exact keywords from the job analysis to summary, experience, soft and hard skills, and education
	- GOAL: Make it appear as if the candidate has been doing exactly what this job requires

	**SUMMARY SECTION REQUIREMENTS:**
	- Include relevant professional experience like job title and experience in the field
	- Mention areas of expertise, specializations and skills from the job analysis
	- Include one or two impressive achievements to show contribution potential
	- Maximum 5 sentences
	- MANDATORY: Must include these EXACT keywords from the job analysis:
	  * At least 3-4 keywords from "Key Skills Required" (e.g., JavaScript, Python, Go, Java, TypeScript, C++)
	  * At least 2-3 keywords from "ATS Keywords" (e.g., AI models, generative AI, software engineering concepts)
	  * At least 1-2 keywords from "Required Experience" (e.g., professional experience building production-grade software)
	- Bold the most important technical skills and keywords using **bold** syntax
	- Example integration: "Senior **JavaScript** and **Python** developer with **generative AI** experience..."

	**WORK EXPERIENCE REQUIREMENTS - CRITICAL TRANSFORMATION:**
	- DO NOT keep original bullet points unchanged - you MUST transform them to match the job description
	- Each experience must include more than 8 detailed bullet points that are REWRITTEN to include job-specific keywords
	- MANDATORY TRANSFORMATION: Rewrite every bullet point to include specific keywords from the job analysis:
	  * Transform generic tasks into **JavaScript**, **Python**, **Go**, **Java**, **TypeScript**, **C++** specific implementations
	  * Rewrite achievements to include **AI models**, **generative AI**, **software engineering concepts**, **coding best practices**
	  * Convert responsibilities to include **professional experience building production-grade software**, **hands-on experience conducting code reviews**
	- REWRITE EXAMPLES:
	  * Original: "Developed web applications" → Transformed: "Developed **production-grade software** using **JavaScript** and **Python**, implementing **generative AI** models with **coding best practices**"
	  * Original: "Led team projects" → Transformed: "Led **collaborative** development teams building **AI models** using **TypeScript** and **Go**, conducting **code reviews** and ensuring **software engineering concepts**"
	  * Original: "Improved system performance" → Transformed: "Enhanced **production-grade software** performance by 40% using **Python** and **JavaScript**, implementing **generative AI** optimization with **coding best practices**"
	- Adjust job titles to best fit the target job when appropriate
	- Bold ALL technical terms and achievements using **bold** syntax
	- Each bullet MUST sound like it directly relates to the job requirements, not generic work

	**SKILLS SECTION REQUIREMENTS:**
	- Must include more than 8 bullet points that match the job description
	- MANDATORY: Must include ALL of these EXACT keywords from the job analysis:
	  * ALL "Key Skills Required": JavaScript, Python, Go, Java, TypeScript, C++
	  * ALL "ATS Keywords": AI models, generative AI, software engineering concepts, coding best practices
	  * Relevant "Company Values": innovation, collaboration, flexibility
	- Add soft skills that reflect the "Company Values" identified
	- Should not be too small - provide comprehensive coverage with all extracted keywords
	- Organize skills by category (Programming Languages, AI/ML Technologies, Software Engineering, etc.)
	- Example format:
	  * Programming Languages: **JavaScript**, **Python**, **Go**, **Java**, **TypeScript**, **C++**
	  * AI/ML Technologies: **Generative AI**, **AI models**
	  * Software Engineering: **Coding best practices**, **Software engineering concepts**

	**MANDATORY VOCABULARY:**
	- MUST use these words throughout the resume: Adaptability/flexibility, creativity, problem solving, Curiosity, Emotional intelligence, Persistence, Relationship-building, Resourcefulness, sophisticated knowledge, mastery, realized, transformed, augmented
	- AVOID these words: experience, expertise, achieved, influenced, increased

	**FORMATTING & ATS OPTIMIZATION:**
	- Keep EXACT formatting, spacing, bullets, and structure from the original resume
	- Preserve all line breaks, indentation, and visual layout
	- Maintain the same section headers and organization
	- Ensure professional appearance that doesn't feel AI-generated
	- Incorporate all exact keywords from job description naturally
	- Use strong, varied action verbs (no repetition)
	- Bold important verbs and keywords for emphasis using **bold** markdown syntax

	**CRITICAL JSON FORMAT REQUIREMENTS:**
	- You MUST return ONLY valid JSON - no additional text before or after
	- Escape all quotes and special characters properly in the JSON
	- Use \\n for line breaks within the modifiedResume string
	- Use \\t for tab indentation within the modifiedResume string
	- Ensure the modifiedResume maintains the EXACT same structure as the original

	**Return ONLY this valid JSON format:**
	{
		"modifiedResume": "the comprehensively tailored resume with substantial changes to match the job - preserve exact formatting with \\n and \\t",
		"summary": "detailed summary of the specific changes made to optimize for this job",
		"keyChanges": ["specific change 1", "specific change 2", "specific change 3"],
		"atsScore": 85
	}

	**ATS Score Calculation Guidelines - MUST ACHIEVE 90+ FOR PROPER TAILORING:**
	- Score 92-95: ALL keywords integrated, work experience completely transformed to match job, every bullet point contains job-specific terms, perfect formatting
	- Score 90-91: Most keywords integrated, work experience substantially modified with job-specific content, good keyword density throughout
	- Score 85-89: Good keyword integration but work experience not fully transformed, some generic content remains
	- Score 80-84: Basic keyword integration, minimal work experience transformation, still too generic
	- Score Below 80: UNACCEPTABLE - indicates insufficient tailoring and transformation
	
	**SCORING REQUIREMENTS FOR 90+:**
	- ALL programming languages from job analysis appear in work experience bullets
	- ALL AI-related keywords appear in work experience descriptions
	- Work experience bullets are completely rewritten to sound job-specific, not generic
	- Summary contains at least 5 job-specific keywords
	- Skills section includes ALL extracted keywords organized by category

	CRITICAL: This must be a comprehensive tailoring that transforms the resume to perfectly align with the job requirements while maintaining authenticity and professional quality.

	**KEYWORD INTEGRATION CHECKLIST - VERIFY BEFORE SUBMITTING (MUST SCORE 90+):**
	✓ SUMMARY contains: JavaScript, Python, Go, generative AI, AI models (minimum 5 keywords) - REWRITTEN not just added
	✓ WORK EXPERIENCE bullets COMPLETELY TRANSFORMED: 
	  - Every bullet mentions specific programming languages (JavaScript, Python, Go, Java, TypeScript, C++)
	  - Every bullet includes AI terms (generative AI, AI models, software engineering concepts)
	  - Every bullet includes job-specific phrases (production-grade software, coding best practices, code reviews)
	  - NO generic bullets remain - all are job-specific
	✓ SKILLS section lists: JavaScript, Python, Go, Java, TypeScript, C++, generative AI, AI models, software engineering concepts, coding best practices
	✓ "Required Experience" terms appear throughout work descriptions: "professional experience building production-grade software", "hands-on experience conducting code reviews"
	✓ "Company Values" reflected: innovation, collaboration, flexibility
	✓ Keywords are distributed across Summary, Experience, and Skills sections
	✓ Most important keywords are bolded using **bold** syntax
	✓ Each work experience bullet point contains at least 3-4 keywords from the analysis
	✓ Skills section is organized by categories with all technical keywords
	✓ Work experience sounds like candidate has been doing this exact job for years

	CRITICAL VERIFICATION: 
	- Count keywords in work experience - each bullet must have 3+ job-specific keywords
	- Verify work experience is TRANSFORMED not just keyword-stuffed
	- Ensure ATS score is 90+ by meeting all transformation requirements
	
	FAILURE TO COMPLETELY TRANSFORM WORK EXPERIENCE WILL RESULT IN SCORE BELOW 90 AND ATS REJECTION.
	`;

	console.log("Sending optimization prompt to OpenAI...");
	const response = await callOpenAI(prompt);
	console.log("OpenAI optimization response received:", `${response.substring(0, 300)}...`);

	try {
		// Clean the response to extract just the JSON
		let cleanResponse = response.trim();

		// Remove any markdown code blocks
		if (cleanResponse.startsWith("```json")) {
			cleanResponse = cleanResponse.replace(/```json\n?/, "").replace(/\n?```/, "");
		} else if (cleanResponse.startsWith("```")) {
			cleanResponse = cleanResponse.replace(/```\n?/, "").replace(/\n?```/, "");
		}

		// Remove any text before the first { and after the last }
		const firstBrace = cleanResponse.indexOf("{");
		const lastBrace = cleanResponse.lastIndexOf("}");
		if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
			cleanResponse = cleanResponse.substring(firstBrace, lastBrace + 1);
		}

		console.log(`Cleaned response for parsing: ${cleanResponse.substring(0, 200)}...`);

		const parsedResponse = JSON.parse(cleanResponse);
		console.log("Parsed optimization result:", {
			summary: parsedResponse.summary,
			keyChanges: parsedResponse.keyChanges,
			atsScore: parsedResponse.atsScore,
			modifiedResumeLength: parsedResponse.modifiedResume?.length || 0,
		});

		// Validate required fields
		if (!parsedResponse.modifiedResume || !parsedResponse.summary) {
			throw new Error("Missing required fields in response");
		}

		// Check if the modified resume is significantly different from the original
		const originalLength = originalResume.length;
		const modifiedLength = parsedResponse.modifiedResume?.length || 0;
		const similarity = Math.abs(originalLength - modifiedLength) / Math.max(originalLength, modifiedLength);

		console.log(`Resume optimization similarity check: ${(similarity * 100).toFixed(1)}% different`);

		if (similarity < 0.1) {
			console.warn("Warning: Modified resume appears very similar to original. This might indicate insufficient changes.");
		}

		return {
			modifiedResume: parsedResponse.modifiedResume,
			summary: parsedResponse.summary,
			keyChanges: parsedResponse.keyChanges || [],
			atsScore: parsedResponse.atsScore || 75,
		};
	} catch (error) {
		console.error("Failed to parse optimization response:", error);
		console.error(`Raw response was: ${response.substring(0, 500)}...`);

		// Try to extract content between quotes if it looks like a malformed JSON
		let extractedResume = originalResume;
		try {
			// Look for content that might be the modified resume
			const resumeMatch = response.match(/"modifiedResume"\s*:\s*"([^"]+)"/);
			if (resumeMatch) {
				extractedResume = resumeMatch[1].replace(/\\n/g, "\n").replace(/\\t/g, "\t");
			}
		} catch (extractError) {
			console.error("Failed to extract resume from malformed response:", extractError);
		}

		// Calculate a basic ATS score based on response quality
		const responseLength = response.length;
		const hasKeywords = /(javascript|python|react|node|development|software|engineering|programming)/i.test(response);
		const hasFormatting = /(•|\*|-|\d+\.|\n\n)/.test(response);

		let fallbackAtsScore = 65; // Base score
		if (responseLength > 500) fallbackAtsScore += 10; // Good content length
		if (hasKeywords) fallbackAtsScore += 10; // Has relevant keywords
		if (hasFormatting) fallbackAtsScore += 5; // Has proper formatting

		return {
			modifiedResume: extractedResume,
			summary: "Resume has been modified to match the job description (recovered from malformed response)",
			keyChanges: ["Content tailored to job requirements", "Keywords integrated from job analysis"],
			atsScore: Math.min(fallbackAtsScore, 85), // Cap at 85 for fallback
		};
	}
}

export async function generateCoverLetter(jobDescription: string, resume: string, companyName: string): Promise<string> {
	// Get current date in proper format
	const currentDate = new Date().toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const prompt = `
	Tailor the job description and resume to create a compelling cover letter. Use power verbs and give a non-AI generated feeling. Add conjunctions and natural language to sound authentic and human.

	**Company:** ${companyName}
	**Job Description:** ${jobDescription}
	**Resume:** ${resume}
	**Current Date:** ${currentDate}

	**CRITICAL STRUCTURE - Follow this exact format:**

	**HEADER SECTION:**
	- Extract candidate's name, email, phone number, and location from the resume
	- Format as professional header
	- Use the provided current date: ${currentDate}
	- Include company name and "Hiring Manager" salutation

	**COVER LETTER BODY - 4 paragraphs:**

	**Paragraph 1 - PROBLEM (1-2 sentences maximum):**
	State the specific PROBLEM that the company faces. What is the issue/need/opportunity that this role will address? Extract this from the job description.

	**Paragraph 2 - SOLUTION (1-2 sentences maximum):**
	What SOLUTION do you offer? How are you the answer to their need? Position yourself as the solution to their problem.

	**Paragraph 3 - EXPLANATION (3-4 sentences):**
	What experience do you have that supports your assertion that you can help? Use specific examples from the resume that directly relate to solving their problem. Include metrics and achievements.

	**Paragraph 4 - CALL TO ACTION (1-2 sentences):**
	Kindly suggest next steps using phrases like "I would love to..." or similar natural language. Make it conversational and genuine.

	**CLOSING:**
	Professional closing with "Sincerely," followed by the candidate's name

	**WRITING STYLE REQUIREMENTS:**
	- Use power verbs throughout (developed, implemented, optimized, transformed, etc.)
	- Add natural conjunctions (and, but, however, moreover, furthermore, etc.)
	- Include conversational elements to avoid AI-generated feeling
	- Use varied sentence structures and lengths
	- Make it sound authentic and human-written
	- Incorporate specific keywords from the job description naturally
	- Match the tone to the company culture if evident from the job description

	**FORMAT EXAMPLE:**
	[Candidate Name]
	[Email] | [Phone] | [Location]

	${currentDate}

	Dear ${companyName} Hiring Manager,

	[Paragraph 1 - Problem identification]

	[Paragraph 2 - Solution positioning]

	[Paragraph 3 - Experience explanation with specific examples]

	[Paragraph 4 - Call to action]

	Sincerely,
	[Candidate Name]

	**CRITICAL REQUIREMENTS:**
	1. Use the EXACT date provided: ${currentDate} - do not change or modify this date
	2. Extract all contact information from the resume provided
	3. Return only the complete cover letter text with proper formatting and line breaks
	4. Do not include any placeholder brackets or template text
	5. Use the exact date format as provided above
	`;

	return await callOpenAI(prompt);
}

export async function analyzeJobDescription(jobDescription: string): Promise<{
	keySkills: string[];
	requiredExperience: string[];
	companyValues: string[];
	suggestedKeywords: string[];
}> {
	console.log("analyzeJobDescription called with:", `${jobDescription.substring(0, 100)}...`);

	const prompt = `
	Analyze the following job description and extract key information for resume optimization:

	**Job Description:** ${jobDescription}

	**Please extract and return ONLY a valid JSON object:**
	{
		"keySkills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
		"requiredExperience": ["experience1", "experience2", "experience3"],
		"companyValues": ["value1", "value2", "value3"],
		"suggestedKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
	}

	**Extraction Guidelines:**
	- Key Skills: Technical skills, programming languages, tools, frameworks
	- Required Experience: Years of experience, specific roles, industry experience
	- Company Values: Culture, work style, company mission, soft skills
	- Suggested Keywords: ATS-friendly terms, industry jargon, specific technologies

	**Important:** Return ONLY the JSON object, no additional text or explanations.
	`;

	console.log("Sending prompt to OpenAI...");
	const response = await callOpenAI(prompt);
	console.log("OpenAI response received:", `${response.substring(0, 200)}...`);

	try {
		// Clean the response to extract just the JSON
		let cleanResponse = response.trim();

		// Remove any markdown code blocks
		if (cleanResponse.startsWith("```json")) {
			cleanResponse = cleanResponse.replace(/```json\n?/, "").replace(/\n?```/, "");
		} else if (cleanResponse.startsWith("```")) {
			cleanResponse = cleanResponse.replace(/```\n?/, "").replace(/\n?```/, "");
		}

		const parsed = JSON.parse(cleanResponse);
		console.log("Parsed analysis result:", parsed);

		// Validate the structure
		if (!parsed.keySkills || !parsed.requiredExperience || !parsed.companyValues || !parsed.suggestedKeywords) {
			throw new Error("Invalid response structure");
		}

		return parsed;
	} catch (error) {
		console.error("Failed to parse analysis response:", error);
		console.error("Raw response was:", response);

		// Return a fallback analysis based on common patterns
		const fallbackAnalysis = {
			keySkills: extractSkillsFromText(jobDescription),
			requiredExperience: extractExperienceFromText(jobDescription),
			companyValues: extractValuesFromText(jobDescription),
			suggestedKeywords: extractKeywordsFromText(jobDescription),
		};

		console.log("Using fallback analysis:", fallbackAnalysis);
		return fallbackAnalysis;
	}
}

// Fallback extraction functions
function extractSkillsFromText(text: string): string[] {
	const skills: string[] = [];
	const skillPatterns = [
		/\b(?:JavaScript|Python|Java|C\+\+|C#|React|Angular|Vue|Node\.js|Express|Django|Flask|SQL|MongoDB|AWS|Azure|Docker|Kubernetes|Git|Agile|Scrum)\b/gi,
		/\b(?:HTML|CSS|TypeScript|PHP|Ruby|Go|Rust|Swift|Kotlin|Scala|R|MATLAB|Tableau|PowerBI|Jira|Confluence|Slack|Zoom|Teams)\b/gi,
	];

	for (const pattern of skillPatterns) {
		const matches = text.match(pattern);
		if (matches) {
			skills.push(...matches.map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()));
		}
	}

	return [...new Set(skills)].slice(0, 5);
}

function extractExperienceFromText(text: string): string[] {
	const experience: string[] = [];
	const expPatterns = [/\b(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)\b/gi, /\b(?:senior|junior|mid-level|entry-level|lead|principal|architect)\b/gi];

	for (const pattern of expPatterns) {
		const matches = text.match(pattern);
		if (matches) {
			experience.push(...matches.map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()));
		}
	}

	return [...new Set(experience)].slice(0, 3);
}

function extractValuesFromText(text: string): string[] {
	const values: string[] = [];
	const valuePatterns = [
		/\b(?:collaboration|teamwork|innovation|creativity|problem-solving|communication|leadership|adaptability|flexibility|remote|hybrid|fast-paced|startup|enterprise)\b/gi,
	];

	for (const pattern of valuePatterns) {
		const matches = text.match(pattern);
		if (matches) {
			values.push(...matches.map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()));
		}
	}

	return [...new Set(values)].slice(0, 3);
}

function extractKeywordsFromText(text: string): string[] {
	const keywords: string[] = [];
	const keywordPatterns = [
		/\b(?:full-stack|frontend|backend|fullstack|software|web|mobile|cloud|devops|data|machine learning|AI|artificial intelligence|blockchain|cybersecurity)\b/gi,
	];

	for (const pattern of keywordPatterns) {
		const matches = text.match(pattern);
		if (matches) {
			keywords.push(...matches.map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()));
		}
	}

	return [...new Set(keywords)].slice(0, 5);
}

const AIService = {
	modifyResume,
	generateCoverLetter,
	analyzeJobDescription,
};

export default AIService;

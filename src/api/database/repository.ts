// Repository functions (disabled for Supabase)

// Placeholder types for compatibility
type ResultSetHeader = { insertId?: number; affectedRows: number };
type RowDataPacket = Record<string, any>;

// Placeholder function for compatibility
const executeQuery = async (query: string, params?: any[]): Promise<any[]> => {
	console.warn("executeQuery called but disabled - using Supabase instead");
	return [];
};

export interface DatabaseUser extends RowDataPacket {
	id: string;
	email: string;
	username?: string;
	password_hash: string;
	avatar?: string;
	country?: string;
	status?: number;
	role?: number;
	created_at: string;
	updated_at: string;
}

export interface DatabaseProfile extends RowDataPacket {
	id: string;
	created_at: string;
	name?: string;
	dob?: string;
	gender?: string;
	phone?: string;
	email?: string;
	job_sites?: string;
	country?: string;
	user: string;
	user_id?: string;
	user_email?: string;
}

export interface DatabaseProposal extends RowDataPacket {
	id: string;
	created_at: string;
	profile?: string;
	user: string;
	job_description?: string;
	resume?: string;
	job_link?: string;
	company?: string;
	cover_letter?: string;
}

export interface DatabaseInterview extends RowDataPacket {
	id: string;
	created_at: string;
	proposal?: string;
	meeting_link?: string;
	meeting_date?: string;
	interviewer?: string;
	progress?: number;
	meeting_title?: string;
	user?: string;
	profile?: string;
	job_description?: string;
	profile_id?: string;
	profile_email?: string;
	user_id?: string;
	user_email?: string;
}

// User Repository
export const UserRepository = {
	async findById(id: string): Promise<DatabaseUser | null> {
		const rows = await executeQuery("SELECT * FROM users WHERE id = ?", [id]);
		return (rows[0] as DatabaseUser) || null;
	},

	async findByEmail(email: string): Promise<DatabaseUser | null> {
		const rows = await executeQuery("SELECT * FROM users WHERE email = ?", [email]);
		return (rows[0] as DatabaseUser) || null;
	},

	async findByRole(role: number): Promise<DatabaseUser[]> {
		const rows = await executeQuery("SELECT * FROM users WHERE role = ?", [role]);
		return rows as DatabaseUser[];
	},

	async create(user: Partial<DatabaseUser>): Promise<string> {
		const { email, username, password_hash, avatar, country, status = 1, role = 1 } = user;
		const result = (await executeQuery("INSERT INTO users (email, username, password_hash, avatar, country, status, role) VALUES (?, ?, ?, ?, ?, ?, ?)", [
			email,
			username,
			password_hash,
			avatar,
			country,
			status,
			role,
		])) as ResultSetHeader[];
		return result[0].insertId?.toString() || "";
	},

	async update(id: string, updates: Partial<DatabaseUser>): Promise<boolean> {
		const fields = Object.keys(updates)
			.filter((key) => key !== "id")
			.map((key) => `${key} = ?`);
		const values = Object.keys(updates)
			.filter((key) => key !== "id")
			.map((key) => updates[key as keyof DatabaseUser]);

		if (fields.length === 0) return false;

		const result = (await executeQuery(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, [...values, id])) as ResultSetHeader[];

		return result[0].affectedRows > 0;
	},

	async delete(id: string): Promise<boolean> {
		const result = (await executeQuery("DELETE FROM users WHERE id = ?", [id])) as ResultSetHeader[];
		return result[0].affectedRows > 0;
	},
};

// Profile Repository
export const ProfileRepository = {
	async findByUserId(userId: string): Promise<DatabaseProfile[]> {
		const rows = await executeQuery(
			`SELECT p.*, u.id as user_id, u.email as user_email 
       FROM profiles p 
       LEFT JOIN users u ON p.user = u.id 
       WHERE p.user = ?`,
			[userId],
		);
		return rows as DatabaseProfile[];
	},

	async findUserProfile(userId: string): Promise<DatabaseProfile | null> {
		const rows = await executeQuery(
			`SELECT p.*, u.id as user_id, u.email as user_email 
       FROM profiles p 
       LEFT JOIN users u ON p.user = u.id 
       WHERE p.user = ? 
       LIMIT 1`,
			[userId],
		);
		return (rows[0] as DatabaseProfile) || null;
	},

	async findAll(): Promise<DatabaseProfile[]> {
		const rows = await executeQuery(
			`SELECT p.*, u.id as user_id, u.email as user_email 
       FROM profiles p 
       LEFT JOIN users u ON p.user = u.id`,
		);
		return rows as DatabaseProfile[];
	},

	async upsert(profile: Partial<DatabaseProfile>): Promise<string> {
		const { id, name, dob, gender, phone, email, job_sites, country, user } = profile;

		if (id) {
			// Update existing profile
			await executeQuery("UPDATE profiles SET name = ?, dob = ?, gender = ?, phone = ?, email = ?, job_sites = ?, country = ?, user = ? WHERE id = ?", [
				name,
				dob,
				gender,
				phone,
				email,
				job_sites,
				country,
				user,
				id,
			]);
			return id;
		}

		// Insert new profile
		const result = (await executeQuery("INSERT INTO profiles (name, dob, gender, phone, email, job_sites, country, user) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
			name,
			dob,
			gender,
			phone,
			email,
			job_sites,
			country,
			user,
		])) as ResultSetHeader[];
		return result[0].insertId?.toString() || "";
	},

	async delete(id: string): Promise<boolean> {
		const result = (await executeQuery("DELETE FROM profiles WHERE id = ?", [id])) as ResultSetHeader[];
		return result[0].affectedRows > 0;
	},
};

// Proposal Repository
export const ProposalRepository = {
	async findByUser(userId: string, profileId?: string): Promise<DatabaseProposal[]> {
		let query = "SELECT * FROM proposals WHERE user = ?";
		const params = [userId];

		if (profileId) {
			query += " AND profile = ?";
			params.push(profileId);
		}

		query += " ORDER BY created_at DESC";

		const rows = await executeQuery(query, params);
		return rows as DatabaseProposal[];
	},

	async findAll(): Promise<DatabaseProposal[]> {
		const rows = await executeQuery("SELECT * FROM proposals ORDER BY created_at DESC");
		return rows as DatabaseProposal[];
	},

	async upsert(proposal: Partial<DatabaseProposal>): Promise<string> {
		const { id, profile, user, job_description, resume, job_link, company, cover_letter } = proposal;

		if (id) {
			// Update existing proposal
			await executeQuery(
				"UPDATE proposals SET profile = ?, user = ?, job_description = ?, resume = ?, job_link = ?, company = ?, cover_letter = ? WHERE id = ?",
				[profile, user, job_description, resume, job_link, company, cover_letter, id],
			);
			return id;
		}

		// Insert new proposal
		const result = (await executeQuery(
			"INSERT INTO proposals (profile, user, job_description, resume, job_link, company, cover_letter) VALUES (?, ?, ?, ?, ?, ?, ?)",
			[profile, user, job_description, resume, job_link, company, cover_letter],
		)) as ResultSetHeader[];
		return result[0].insertId?.toString() || "";
	},

	async deleteById(id: string): Promise<boolean> {
		const result = (await executeQuery("DELETE FROM proposals WHERE id = ?", [id])) as ResultSetHeader[];
		return result[0].affectedRows > 0;
	},

	async deleteByIds(ids: string[]): Promise<boolean> {
		if (ids.length === 0) return false;
		const placeholders = ids.map(() => "?").join(",");
		const result = (await executeQuery(`DELETE FROM proposals WHERE id IN (${placeholders})`, ids)) as ResultSetHeader[];
		return result[0].affectedRows > 0;
	},
};

// Interview Repository
export const InterviewRepository = {
	async findByFilters(filters: { profile?: string; user?: string; proposal?: string }): Promise<DatabaseInterview[]> {
		let query = `
      SELECT i.*, 
             p.id as profile_id, p.email as profile_email,
             u.id as user_id, u.email as user_email
      FROM interviews i
      LEFT JOIN profiles p ON i.profile = p.id
      LEFT JOIN users u ON i.user = u.id
      WHERE 1=1
    `;
		const params: string[] = [];

		if (filters.profile) {
			query += " AND i.profile = ?";
			params.push(filters.profile);
		}
		if (filters.user) {
			query += " AND i.user = ?";
			params.push(filters.user);
		}
		if (filters.proposal) {
			query += " AND i.proposal = ?";
			params.push(filters.proposal);
		}

		query += " ORDER BY i.created_at DESC";

		const rows = await executeQuery(query, params);
		return rows as DatabaseInterview[];
	},

	async findByUser(userId: string): Promise<DatabaseInterview[]> {
		const rows = await executeQuery("SELECT * FROM interviews WHERE user = ? ORDER BY created_at DESC", [userId]);
		return rows as DatabaseInterview[];
	},

	async findAll(): Promise<DatabaseInterview[]> {
		const rows = await executeQuery(
			`SELECT i.*, 
             p.id as profile_id, p.email as profile_email,
             u.id as user_id, u.email as user_email,
             pr.id as proposal_id, pr.job_description as proposal_job_description, pr.company as proposal_company, pr.job_link as proposal_job_link
      FROM interviews i
      LEFT JOIN profiles p ON i.profile = p.id
      LEFT JOIN users u ON i.user = u.id
      LEFT JOIN proposals pr ON i.proposal = pr.id
      ORDER BY i.created_at DESC`,
		);
		return rows as DatabaseInterview[];
	},

	async upsert(interview: Partial<DatabaseInterview>): Promise<string> {
		const { id, proposal, meeting_link, meeting_date, interviewer, progress, meeting_title, user, profile, job_description } = interview;

		if (id) {
			// Update existing interview
			await executeQuery(
				"UPDATE interviews SET proposal = ?, meeting_link = ?, meeting_date = ?, interviewer = ?, progress = ?, meeting_title = ?, user = ?, profile = ?, job_description = ? WHERE id = ?",
				[proposal, meeting_link, meeting_date, interviewer, progress, meeting_title, user, profile, job_description, id],
			);
			return id;
		}

		// Insert new interview
		const result = (await executeQuery(
			"INSERT INTO interviews (proposal, meeting_link, meeting_date, interviewer, progress, meeting_title, user, profile, job_description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			[proposal, meeting_link, meeting_date, interviewer, progress, meeting_title, user, profile, job_description],
		)) as ResultSetHeader[];
		return result[0].insertId?.toString() || "";
	},

	async delete(id: string): Promise<boolean> {
		const result = (await executeQuery("DELETE FROM interviews WHERE id = ?", [id])) as ResultSetHeader[];
		return result[0].affectedRows > 0;
	},
};

// Session Repository for JWT management
export const SessionRepository = {
	async create(userId: string, refreshToken: string, expiresAt: Date): Promise<string> {
		const result = (await executeQuery("INSERT INTO user_sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)", [
			userId,
			refreshToken,
			expiresAt,
		])) as ResultSetHeader[];
		return result[0].insertId?.toString() || "";
	},

	async findByRefreshToken(refreshToken: string): Promise<any | null> {
		const rows = await executeQuery("SELECT * FROM user_sessions WHERE refresh_token = ? AND expires_at > NOW()", [refreshToken]);
		return rows[0] || null;
	},

	async deleteByUserId(userId: string): Promise<boolean> {
		const result = (await executeQuery("DELETE FROM user_sessions WHERE user_id = ?", [userId])) as ResultSetHeader[];
		return result[0].affectedRows > 0;
	},

	async deleteExpired(): Promise<boolean> {
		const result = (await executeQuery("DELETE FROM user_sessions WHERE expires_at <= NOW()")) as ResultSetHeader[];
		return result[0].affectedRows > 0;
	},
};

-- =====================================================
-- SUPABASE POSTGRESQL SCHEMA FOR PROJECT MANAGEMENT SYSTEM
-- =====================================================
-- This is the complete, consolidated database schema
-- Run this entire file in your Supabase SQL Editor
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Create users table with role-based access control
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role INTEGER DEFAULT 1 CHECK (role IN (0, 1, 2)), -- 0=admin, 1=user, 2=caller
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    profile_picture VARCHAR(255),
    phone VARCHAR(20),
    department VARCHAR(50),
    position VARCHAR(50)
);

-- Create projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    spent_budget DECIMAL(15,2) DEFAULT 0,
    progress DECIMAL(5,2) DEFAULT 0,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'completed', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create job_applications table with resume tracking
CREATE TABLE job_applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(100) NOT NULL,
    position_title VARCHAR(100) NOT NULL,
    application_date DATE,
    status VARCHAR(30) DEFAULT 'applied' CHECK (status IN ('applied', 'interview_scheduled', 'interviewed', 'offer_received', 'rejected', 'withdrawn')),
    job_description TEXT,
    salary_range VARCHAR(50),
    location VARCHAR(100),
    application_url VARCHAR(500),
    notes TEXT,
    follow_up_date DATE,
    resume_file_path VARCHAR(500),
    has_resume BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create interviews table (supports both linked and standalone interviews)
CREATE TABLE interviews (
    id SERIAL PRIMARY KEY,
    job_application_id INTEGER REFERENCES job_applications(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    interview_type VARCHAR(20) DEFAULT 'video' CHECK (interview_type IN ('phone', 'video', 'in_person', 'technical', 'panel')),
    scheduled_date TIMESTAMP,
    duration_minutes INTEGER DEFAULT 60,
    interviewer_name VARCHAR(100),
    interviewer_email VARCHAR(100),
    location VARCHAR(200),
    meeting_link VARCHAR(500),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    notes TEXT,
    feedback TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    -- Additional columns for standalone interviews and resume tracking
    company_name VARCHAR(100),
    position_title VARCHAR(100),
    job_description TEXT,
    resume_link VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    -- Constraint to ensure either job_application_id exists OR both company_name and position_title exist
    CONSTRAINT interviews_application_or_manual_check 
    CHECK (
        (job_application_id IS NOT NULL) OR 
        (company_name IS NOT NULL AND position_title IS NOT NULL)
    )
);

-- Create saved_resumes table
CREATE TABLE saved_resumes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    resume_json JSONB,
    file_path VARCHAR(500),
    file_type VARCHAR(10) DEFAULT 'pdf' CHECK (file_type IN ('pdf', 'docx', 'txt')),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create proposals table
CREATE TABLE proposals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    saved_resume_id INTEGER REFERENCES saved_resumes(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    client_name VARCHAR(100),
    project_description TEXT,
    proposal_content TEXT,
    budget_amount DECIMAL(15,2),
    timeline VARCHAR(100),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'negotiating')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- SCHEDULE PERMISSIONS SYSTEM
-- =====================================================

-- Create schedule_permissions table for caller access control
CREATE TABLE schedule_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Unique constraint to prevent duplicate active permissions
    CONSTRAINT unique_active_permission UNIQUE (user_id, target_user_id) WHERE is_active = true
);

-- =====================================================
-- CALL MANAGEMENT SYSTEM
-- =====================================================

-- Create call_schedules table for caller role
CREATE TABLE call_schedules (
    id SERIAL PRIMARY KEY,
    contact_name VARCHAR(100) NOT NULL,
    company VARCHAR(100),
    phone_number VARCHAR(20),
    email VARCHAR(100),
    call_type VARCHAR(20) DEFAULT 'follow_up' CHECK (call_type IN ('interview', 'follow_up', 'networking', 'client', 'personal')),
    scheduled_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'failed', 'rescheduled', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    notes TEXT,
    preparation_notes TEXT,
    outcome_notes TEXT,
    assigned_caller_id INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    auto_dial_enabled BOOLEAN DEFAULT FALSE,
    recording_enabled BOOLEAN DEFAULT FALSE,
    follow_up_required BOOLEAN DEFAULT FALSE,
    reminder_minutes INTEGER[] DEFAULT ARRAY[15, 5],
    related_entity_type VARCHAR(50), -- 'job_application', 'interview', 'project', etc.
    related_entity_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    failed_reason VARCHAR(255)
);

-- Create call_notifications table
CREATE TABLE call_notifications (
    id SERIAL PRIMARY KEY,
    call_id INTEGER REFERENCES call_schedules(id) ON DELETE CASCADE,
    caller_id INTEGER REFERENCES users(id),
    notification_type VARCHAR(20) DEFAULT 'reminder' CHECK (notification_type IN ('reminder', 'assignment', 'status_change', 'follow_up')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    scheduled_for TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'read', 'dismissed')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    delivery_method VARCHAR(20) DEFAULT 'in_app' CHECK (delivery_method IN ('in_app', 'email', 'sms', 'push')),
    created_at TIMESTAMP DEFAULT NOW(),
    sent_at TIMESTAMP,
    read_at TIMESTAMP
);

-- Create caller_performance table
CREATE TABLE caller_performance (
    id SERIAL PRIMARY KEY,
    caller_id INTEGER REFERENCES users(id),
    date DATE DEFAULT CURRENT_DATE,
    calls_scheduled INTEGER DEFAULT 0,
    calls_completed INTEGER DEFAULT 0,
    calls_failed INTEGER DEFAULT 0,
    total_call_duration_minutes INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    average_call_duration DECIMAL(5,2) DEFAULT 0.00,
    follow_ups_generated INTEGER DEFAULT 0,
    performance_score DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(caller_id, date)
);

-- =====================================================
-- AUDIT AND SESSION MANAGEMENT
-- =====================================================

-- Create activity_logs table for audit trail
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create sessions table for JWT token management
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Projects and tasks indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Job applications and interviews indexes
CREATE INDEX idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);
CREATE INDEX idx_interviews_job_application_id ON interviews(job_application_id);
CREATE INDEX idx_interviews_user_id ON interviews(user_id);
CREATE INDEX idx_interviews_scheduled_date ON interviews(scheduled_date);
CREATE INDEX idx_interviews_company_name ON interviews(company_name);

-- Resume and proposal indexes
CREATE INDEX idx_saved_resumes_user_id ON saved_resumes(user_id);
CREATE INDEX idx_proposals_user_id ON proposals(user_id);

-- Schedule permissions indexes
CREATE INDEX idx_schedule_permissions_user_id ON schedule_permissions(user_id);
CREATE INDEX idx_schedule_permissions_target_user_id ON schedule_permissions(target_user_id);
CREATE INDEX idx_schedule_permissions_granted_by ON schedule_permissions(granted_by);
CREATE INDEX idx_schedule_permissions_is_active ON schedule_permissions(is_active);

-- Call management indexes
CREATE INDEX idx_call_schedules_caller ON call_schedules(assigned_caller_id);
CREATE INDEX idx_call_schedules_status ON call_schedules(status);
CREATE INDEX idx_call_schedules_scheduled_time ON call_schedules(scheduled_time);
CREATE INDEX idx_call_notifications_caller ON call_notifications(caller_id);
CREATE INDEX idx_call_notifications_status ON call_notifications(status);
CREATE INDEX idx_caller_performance_caller ON caller_performance(caller_id);

-- Audit and session indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON interviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saved_resumes_updated_at BEFORE UPDATE ON saved_resumes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_call_schedules_updated_at BEFORE UPDATE ON call_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_caller_performance_updated_at BEFORE UPDATE ON caller_performance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_permissions_updated_at BEFORE UPDATE ON schedule_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS FOR DASHBOARD
-- =====================================================

-- Create a view for dashboard statistics
CREATE VIEW dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
    (SELECT COUNT(*) FROM tasks WHERE status IN ('todo', 'in_progress')) as pending_tasks,
    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as active_users,
    (SELECT COUNT(*) FROM job_applications WHERE status = 'applied') as pending_applications,
    (SELECT COUNT(*) FROM interviews WHERE status = 'scheduled' AND scheduled_date > NOW()) as upcoming_interviews;

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert default users (password: admin123 for all)
-- Note: Change these passwords immediately after first login
INSERT INTO users (username, email, password_hash, full_name, role, is_active) VALUES
('admin', 'admin@projectmanagement.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 0, TRUE),
('caller', 'caller@projectmanagement.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Call Manager', 2, TRUE),
('testuser', 'testuser@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test User', 1, TRUE),
('victorpeed', 'victor@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Victor Peed', 1, TRUE),
('johnjohnson0831', 'johnjohnson0831@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'James Johnson', 2, TRUE);

-- Insert sample data for demonstration
INSERT INTO projects (name, description, status, priority, start_date, end_date, budget, created_by, assigned_to) VALUES 
('Project Management System', 'Development of a comprehensive project management dashboard', 'active', 'high', '2024-01-01', '2024-06-30', 50000.00, 1, 1),
('Mobile App Development', 'Cross-platform mobile application for client management', 'planning', 'medium', '2024-02-01', '2024-08-31', 75000.00, 1, 1);

INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, created_by, due_date, estimated_hours) VALUES 
(1, 'Setup Database Schema', 'Design and implement the database schema for the project management system', 'completed', 'high', 1, 1, '2024-01-15 17:00:00', 16.0),
(1, 'Develop User Authentication', 'Implement secure user authentication and authorization system', 'in_progress', 'high', 1, 1, '2024-01-30 17:00:00', 24.0),
(1, 'Create Dashboard UI', 'Design and develop the main dashboard interface', 'todo', 'medium', 1, 1, '2024-02-15 17:00:00', 32.0);

-- Insert sample job applications
INSERT INTO job_applications (user_id, company_name, position_title, application_date, status, job_description, salary_range, location, has_resume) VALUES
(3, 'TechCorp', 'Software Engineer', '2024-01-15', 'applied', 'Full-stack development position', '$80,000 - $100,000', 'San Francisco, CA', TRUE),
(4, 'Pager Health', 'Senior Full Stack Engineer', '2024-01-20', 'interview_scheduled', 'Senior engineering role', '$90,000 - $120,000', 'Remote', TRUE);

-- Insert sample interviews
INSERT INTO interviews (user_id, company_name, position_title, interview_type, scheduled_date, duration_minutes, interviewer_name, interviewer_email, status, job_description) VALUES
(4, 'Pager Health', 'Senior Full Stack Engineer', 'video', '2025-09-12 16:00:00', 60, 'James Strum', 'james.strum@pagerhealth.com', 'scheduled', 'Senior engineering role focusing on full-stack development');

-- =====================================================
-- SECURITY: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable Row Level Security for better security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE caller_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (customize as needed for your authentication system)
-- Note: These are basic examples - you'll need to customize based on your auth system

-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Users can view their own job applications
CREATE POLICY "Users can view own job applications" ON job_applications FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can manage own job applications" ON job_applications FOR ALL USING (auth.uid()::text = user_id::text);

-- Users can view their own interviews
CREATE POLICY "Users can view own interviews" ON interviews FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can manage own interviews" ON interviews FOR ALL USING (auth.uid()::text = user_id::text);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

-- Table comments
COMMENT ON TABLE users IS 'User accounts with role-based access control (0=admin, 1=user, 2=caller)';
COMMENT ON TABLE schedule_permissions IS 'Manages which users have permission to view specific other users scheduled interviews and calls';
COMMENT ON TABLE interviews IS 'Interview records supporting both linked and standalone interviews';
COMMENT ON TABLE job_applications IS 'Job applications with resume tracking capabilities';

-- Column comments
COMMENT ON COLUMN users.role IS 'User role: 0=admin, 1=user, 2=caller';
COMMENT ON COLUMN schedule_permissions.user_id IS 'ID of the user who is granted permission to view schedules';
COMMENT ON COLUMN schedule_permissions.target_user_id IS 'ID of the user whose schedules can be viewed';
COMMENT ON COLUMN schedule_permissions.granted_by IS 'ID of the admin who granted the permission';
COMMENT ON COLUMN interviews.job_application_id IS 'Optional reference to job application. NULL for standalone interviews.';
COMMENT ON COLUMN interviews.company_name IS 'Company name for standalone interviews or cached from job application.';
COMMENT ON COLUMN interviews.position_title IS 'Position title for standalone interviews or cached from job application.';
COMMENT ON COLUMN interviews.job_description IS 'Job description for the interview position';
COMMENT ON COLUMN interviews.resume_link IS 'Link to uploaded resume file for this interview';
COMMENT ON COLUMN job_applications.resume_file_path IS 'Path to the uploaded resume file';
COMMENT ON COLUMN job_applications.has_resume IS 'Boolean flag indicating if a resume is attached to this application';

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================
-- This schema includes:
-- ✅ Core project management tables (users, projects, tasks)
-- ✅ Job application and interview management
-- ✅ Resume tracking and management
-- ✅ Schedule permissions for caller role
-- ✅ Call management system
-- ✅ Audit logging and session management
-- ✅ Performance indexes
-- ✅ Automatic timestamp updates
-- ✅ Row Level Security (RLS)
-- ✅ Sample data for testing
-- ✅ Comprehensive documentation
-- =====================================================
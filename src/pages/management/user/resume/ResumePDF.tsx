import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type React from "react";

const styles = StyleSheet.create({
	page: {
		fontSize: 11,
		padding: 40,
		lineHeight: 1.5,
		fontFamily: "Helvetica",
	},
	section: {
		marginBottom: 16,
	},
	mainTitle: {
		fontSize: 22,
		textAlign: "center",
		marginBottom: 14,
		fontWeight: "bold",
		textTransform: "uppercase",
	},
	contactLine: {
		textAlign: "center",
		marginBottom: 12,
	},
	heading: {
		fontSize: 14,
		fontWeight: "bold",
		marginBottom: 4,
		textTransform: "uppercase",
	},
	divider: {
		height: 1,
		backgroundColor: "#333",
		marginBottom: 8,
	},
	bullet: {
		marginLeft: 12,
		marginBottom: 4,
		flexDirection: "row",
	},
	bulletSymbol: {
		marginRight: 4,
	},
	text: {
		marginBottom: 4,
	},
	bold: {
		fontWeight: "bold",
	},
	inline: {
		flexDirection: "row",
		flexWrap: "wrap",
		rowGap: 4,
		columnGap: 8,
	},
});

interface ResumeJSON {
	name: string;
	location: string;
	email: string;
	phone: string;
	linkedin: string;
	summary: string;
	skills: {
		[category: string]: string[];
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

interface Props {
	resume: ResumeJSON;
}

const ResumePDF: React.FC<Props> = ({ resume }) => {
	return (
		<Document>
			<Page size="A4" style={styles.page}>
				{/* Header */}
				<View style={styles.section}>
					<Text style={styles.mainTitle}>{resume.name}</Text>
					<Text style={styles.contactLine}>
						{resume.location} | {resume.email} | {resume.phone}
					</Text>
					<Text style={styles.contactLine}>{resume.linkedin}</Text>
				</View>

				{/* Summary */}
				<View style={styles.section}>
					<Text style={styles.heading}>Summary</Text>
					<View style={styles.divider} />
					<Text style={styles.text}>{resume.summary}</Text>
				</View>

				{/* Key Skills */}
				<View style={styles.section}>
					<Text style={styles.heading}>Key Skills</Text>
					<View style={styles.divider} />
					{Object.entries(resume.skills).map(([category, items]) => (
						<View key={category} style={{ marginBottom: 6 }}>
							<Text style={styles.bold}>{category.replace(/_/g, " ")}:</Text>
							<Text style={styles.text}>{items.join(", ")}</Text>
						</View>
					))}
				</View>

				{/* Work Experience */}
				<View style={styles.section}>
					<Text style={styles.heading}>Work Experience</Text>
					<View style={styles.divider} />
					{resume.experience.map((exp, index) => (
						<View key={`exp-${exp.title}-${exp.company}-${index}`} style={{ marginBottom: 10 }}>
							<Text style={styles.bold}>
								{exp.title} | {exp.company} – {exp.location} | {exp.duration}
							</Text>
							{exp.responsibilities.map((resp) => (
								<View key={`resp-${resp}`} style={styles.bullet}>
									<Text style={styles.bulletSymbol}>•</Text>
									<Text>{resp}</Text>
								</View>
							))}
						</View>
					))}
				</View>

				{/* Education */}
				<View style={styles.section}>
					<Text style={styles.heading}>Education</Text>
					<View style={styles.divider} />
					<Text style={styles.text}>{resume.education.degree}</Text>
					<Text style={styles.text}>
						{resume.education.institution} · {resume.education.location} · {resume.education.year}
					</Text>
				</View>
			</Page>
		</Document>
	);
};

export default ResumePDF;

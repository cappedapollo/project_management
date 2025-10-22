import { themeVars } from "@/theme/theme.css";
import type { CSSProperties } from "react";

export type NavItemStyles = {
	icon: CSSProperties;
	texts: CSSProperties;
	title: CSSProperties;
	caption: CSSProperties;
	info: CSSProperties;
	arrow: CSSProperties;
};

export const navItemStyles: NavItemStyles = {
	icon: {
		display: "inline-flex",
		flexShrink: 0,
		width: 20,
		height: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	texts: {
		display: "inline-flex",
		flexDirection: "column",
		justifyContent: "center",
		flex: "1 1 auto",
		minWidth: 0,
	},
	title: {
		display: "-webkit-box",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: 1,
		overflow: "hidden",
		textOverflow: "ellipsis",
		fontSize: "0.875rem",
		fontWeight: 500,
		textAlign: "left",
		lineHeight: 1.4,
		letterSpacing: "-0.005em",
	},
	caption: {
		display: "-webkit-box",
		WebkitLineClamp: 1,
		WebkitBoxOrient: "vertical",
		overflow: "hidden",
		textOverflow: "ellipsis",
		fontSize: "0.75rem",
		fontWeight: 400,
		color: themeVars.colors.text.disabled,
		textAlign: "left",
		lineHeight: 1.3,
		marginTop: "2px",
	},

	info: {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
		marginLeft: "6px",
	},

	arrow: {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
		width: 16,
		height: 16,
		marginLeft: "6px",
		transition: "all 0.3s ease-in-out",
	},
};

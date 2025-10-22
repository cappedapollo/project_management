import { lazy } from "react";

const Pages = import.meta.glob("/src/pages/**/*.tsx");
const lazyComponentCache = new Map<string, React.LazyExoticComponent<any>>();

export const loadComponentFromPath = (path: string) => {
	const pathArr = path.split("/");
	pathArr.unshift("/src");

	if (!pathArr.includes(".tsx")) {
		return pathArr.push("index.tsx");
	}
	return Pages[pathArr.join("/")];
};

export const Component = (path = "", props?: any): React.ReactNode => {
	if (!path) return null;

	let importFn = Pages[`/src${path}.tsx`];
	if (!importFn) importFn = Pages[`/src${path}/index.tsx`];
	if (!importFn) {
		// Only warn in development mode to reduce console noise
		if (import.meta.env.DEV) {
			console.warn("Component not found for path:", path);
		}
		// Return a placeholder component instead of null
		const PlaceholderComponent = () => (
			<div className="p-6">
				<h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
				<p className="text-gray-600">The page at "{path}" is under development.</p>
			</div>
		);
		return <PlaceholderComponent {...props} />;
	}

	let Element = lazyComponentCache.get(path);
	if (!Element) {
		Element = lazy(importFn as any);
		lazyComponentCache.set(path, Element);
	}
	return <Element {...props} />;
};

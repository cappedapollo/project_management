import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import { GLOBAL_CONFIG } from "@/global-config";

interface PdfPreviewProps {
	fileUrl: string;
}

const PDFPreview: React.FC<PdfPreviewProps> = ({ fileUrl }) => {
	const plugin = defaultLayoutPlugin();

	return (
		<Worker workerUrl={`${GLOBAL_CONFIG.defaultRoute}pdf.worker.min.js`}>
			<Viewer fileUrl={fileUrl} plugins={[plugin]} />
		</Worker>
	);
};

export default PDFPreview;

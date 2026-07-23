import { createWorker, OEM } from "tesseract.js";
import tessWorkerUrl from "tesseract.js/dist/worker.min.js?url";
import FileStaging from "../../components/FileStaging";
import ResultsActions from "../../components/ResultsActions";
import { overlayTextLayer, type OcrWord } from "../../lib/pdf";
import { pdfToImages } from "../../lib/render";
import { stem } from "../../lib/names";
import { useToolRun } from "../../lib/useToolRun";

const SCALE = 2; // 144dpi render for recognition

export default function Ocr() {
  const { files, running, progress, error, outputs, start } = useToolRun(
    async (files, read, setProgress, fail) => {
      // All engine assets are self-hosted (synced to public/ by the prepare script).
      const worker = await createWorker("eng", OEM.LSTM_ONLY, {
        workerPath: tessWorkerUrl,
        corePath: "/tesseract/",
        langPath: "/tessdata",
      });
      const out = [];
      try {
        for (let i = 0; i < files.length; i++) {
          setProgress(i + 1);
          try {
            const bytes = await read(files[i]);
            const images = await pdfToImages(bytes, "p", { format: "png", scale: SCALE, quality: 1 });
            const pages = [];
            for (const img of images) {
              const blob = new Blob([new Uint8Array(img.data)], { type: img.mime });
              const { data } = await worker.recognize(blob, {}, { text: true, blocks: true });
              const words: OcrWord[] = [];
              for (const block of data.blocks ?? [])
                for (const par of block.paragraphs)
                  for (const line of par.lines)
                    for (const w of line.words) words.push({ text: w.text, ...w.bbox });
              pages.push({ words, scale: SCALE });
            }
            out.push({ name: `${stem(files[i].name)}-ocr.pdf`, data: await overlayTextLayer(bytes, pages) });
          } catch (e) {
            fail(`${files[i].name}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      } finally {
        await worker.terminate();
      }
      return out;
    }
  );

  return (
    <section className="tool">
      <h1>🔎 OCR PDF</h1>
      <p className="tool-sub">
        Add an invisible, searchable text layer to scanned pages (English).
        The OCR engine ships with the app. Everything runs on your device, even offline.
      </p>
      <FileStaging accepts="pdf" />
      <button className="primary" disabled={!files.length || running} onClick={start}>
        {running ? `Recognizing ${progress}/${files.length}…` : files.length > 1 ? `OCR ${files.length} PDFs` : "OCR PDF"}
      </button>
      {error && <p className="msg error">⚠️ {error}</p>}
      {outputs.length > 0 && <ResultsActions items={outputs} currentSlug="ocr" />}
    </section>
  );
}

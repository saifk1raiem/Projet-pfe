import { Loader2, Paperclip, Upload, X } from "lucide-react";
import { Button } from "../ui/button";

export function UploadReportModal({
  tr,
  isOpen,
  onClose,
  inputRef,
  onFileChange,
  isDragging,
  onSetDragging,
  selectedFiles,
  isPreviewLoading,
  onSubmit,
  title,
  description,
  dropLabel,
  chooseFilesLabel,
  submitLabel,
}) {
  if (!isOpen) return null;

  const resolvedTitle = title || tr("Previsualiser le rapport", "Preview report");
  const resolvedDescription =
    description ||
    tr(
      "Analysez le rapport du jour avant de l'importer dans la base.",
      "Analyze today's report before importing it into the database.",
    );
  const resolvedDropLabel = dropLabel || tr("Deposez votre rapport ici", "Drag and drop your report here");
  const resolvedChooseFilesLabel = chooseFilesLabel || tr("Choisir des fichiers", "Choose files");
  const resolvedSubmitLabel = submitLabel || tr("Previsualiser", "Preview");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="leoni-rise-up w-full max-w-[760px] rounded-[28px] border border-[#2b3340] bg-[#11151b] p-0 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#2b3340] px-8 py-6">
          <div>
            <h2 className="text-[44px] font-semibold leading-tight">
              {resolvedTitle}
            </h2>
            <p className="mt-2 text-[16px] text-[#9aabbe]">
              {resolvedDescription}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#4a5568] text-[#d6deea] hover:bg-[#1b212b]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-8 py-6">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => onFileChange(e.target.files)}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              onSetDragging(true);
            }}
            onDragLeave={() => onSetDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              onSetDragging(false);
              onFileChange(e.dataTransfer.files);
            }}
            className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
              isDragging ? "border-[#4f99d9] bg-[#182a3d]" : "border-[#3a4554] bg-[#171c24]"
            }`}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1e2631]">
              <Upload className="h-7 w-7 text-[#7ec1f2]" />
            </div>
            <p className="text-[22px] font-medium text-white">
              {resolvedDropLabel}
            </p>
            <p className="mt-2 text-[15px] text-[#9aabbe]">XLSX, XLS, CSV</p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="rounded-2xl border border-[#2f3a48] bg-[#161b23] p-4">
              <p className="mb-3 text-sm font-medium text-[#cfe1f4]">
                {tr("Fichiers selectionnes", "Selected files")} ({selectedFiles.length})
              </p>
              <div className="space-y-2">
                {selectedFiles.map((file, idx) => (
                  <div key={`${file.name}-${idx}`} className="flex items-center gap-2 text-sm text-[#d4e2f0]">
                    <Paperclip className="h-4 w-4 text-[#7ec1f2]" />
                    <span className="truncate">{file.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl border-[#3a4554] bg-transparent px-6 text-white hover:bg-[#1a2029]"
              onClick={() => inputRef.current?.click()}
            >
              {resolvedChooseFilesLabel}
            </Button>
            <Button
              type="button"
              className="h-11 rounded-xl bg-[#005ca9] px-6 text-white hover:bg-[#004a87] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onSubmit}
              disabled={!selectedFiles.length || isPreviewLoading}
            >
              {isPreviewLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tr("Analyse...", "Analyzing...")}
                </span>
              ) : (
                resolvedSubmitLabel
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

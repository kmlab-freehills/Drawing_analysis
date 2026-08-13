'use client';

import { useEffect, useMemo, useRef, useState } from "react";

type ApiOk = { text: string };
type ApiErr = { error: string };

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v = v / 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function Page() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  const canAnalyze = useMemo(() => !!file && !loading, [file, loading]);

  useEffect(() => {
    // image preview only
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const openPicker = () => {
    setError("");
    fileInputRef.current?.click();
  };

  const analyze = async (f: File) => {
    setLoading(true);
    setResult("");
    setError("");

    try {
      const form = new FormData();
      form.append("file", f);

      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        if (contentType.includes("application/json")) {
          const data = (await res.json()) as ApiErr;
          throw new Error(data?.error || "解析に失敗しました");
        }
        const text = await res.text();
        throw new Error(text || "解析に失敗しました");
      }

      const data = (await res.json()) as ApiOk;
      setResult(data.text || "(空の結果)");
    } catch (e: any) {
      setError(e?.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const onAnalyzeClick = () => {
    // 要件: 「解析ボタン → ファイル選択モード → 選択後に解析」
    if (!file) {
      openPicker();
      return;
    }
    analyze(file);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setResult("");
    setError("");

    // 同じファイルを連続で選んでも change が発火するように
    e.target.value = "";

    if (f) {
      await analyze(f); // 選択直後に自動で解析
    }
  };

  const clear = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult("");
    setError("");
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="rounded-2xl overflow-hidden shadow-xl bg-white border border-slate-200">
          {/* header */}
          <div className="px-6 py-5 bg-gradient-to-r from-sky-600 to-blue-700 text-white">
            <h1 className="text-xl sm:text-2xl font-bold">図面 表面積・自動解析</h1>
            <p className="text-white/85 text-sm mt-1">
              図面(PDF/画像)をGeminiで読み取り、表面積計算に必要な寸法抽出→表面積推定を行います。
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* picker */}
            <div className="space-y-2">
              <div className="flex items-end justify-between gap-3">
                <label className="block text-sm font-semibold text-slate-700">
                  図面ファイル (PDF / 画像)
                </label>
                {file ? (
                  <button
                    type="button"
                    onClick={clear}
                    className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-4"
                  >
                    クリア
                  </button>
                ) : null}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={onFileChange}
                className="hidden"
              />

              <div
                role="button"
                tabIndex={0}
                onClick={openPicker}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? openPicker() : null)}
                className={[
                  "rounded-xl border-2 border-dashed p-5 sm:p-6",
                  "transition-colors cursor-pointer",
                  file ? "border-sky-400 bg-sky-50" : "border-slate-300 hover:border-slate-400 bg-slate-50/50",
                ].join(" ")}
              >
                {file ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                      <span className="text-slate-600 text-sm font-bold">
                        {file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "IMG"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 break-all">{file.name}</div>
                      <div className="text-sm text-slate-500">{formatBytes(file.size)} / {file.type || "unknown"}</div>
                      <div className="text-xs text-slate-400 mt-1">クリックで別ファイルを選択</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-slate-700 font-semibold">クリックして図面ファイルを選択</div>
                    <div className="text-slate-500 text-sm mt-1">解析ボタンを押しても選択できます</div>
                  </div>
                )}
              </div>

              {previewUrl ? (
                <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <img src={previewUrl} alt="preview" className="w-full h-auto" />
                </div>
              ) : null}
            </div>

            {/* analyze button */}
            <button
              type="button"
              onClick={onAnalyzeClick}
              disabled={loading}
              className={[
                "w-full rounded-xl px-5 py-4 font-bold text-white shadow-md transition",
                loading ? "bg-slate-300 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-700 active:scale-[0.99]",
              ].join(" ")}
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-3">
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  解析中...
                </span>
              ) : file ? (
                "この図面を解析して表面積を出す"
              ) : (
                "図面を選択して解析する"
              )}
            </button>

            {/* status / errors */}
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                <div className="font-semibold">エラー</div>
                <div className="text-sm mt-1 whitespace-pre-wrap">{error}</div>
                <div className="text-xs mt-2 text-red-700/70">
                  ヒント: <code className="px-1 py-0.5 bg-white/70 rounded">.env.local</code> に
                  <code className="px-1 py-0.5 bg-white/70 rounded">GEMINI_API_KEY</code> が設定されているか確認してください。
                </div>
              </div>
            ) : null}

            {/* result */}
            {result ? (
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <h2 className="font-semibold text-slate-800">解析結果</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Geminiの出力をそのまま表示しています（必要ならプロンプト側でJSON整形できます）。
                  </p>
                </div>
                <pre className="p-4 text-sm leading-relaxed whitespace-pre-wrap break-words bg-white font-mono text-slate-800">
{result}
                </pre>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                ※ 図面の読み取り精度は図面品質・注記・単位系に依存します。重要用途では必ず人手で検算してください。
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Powered by Gemini API
        </div>
      </div>
    </main>
  );
}

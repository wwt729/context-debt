import { formatHtmlReport } from "./html-report.js";
import { formatJsonReport, formatTextReport } from "./report.js";
import type { ReportOptions, ScanResult } from "./types.js";

export type ScanReportFormat = "html" | "json" | "text";

export type ScanReportOptions = {
  color: ReportOptions["color"];
  verbose: boolean;
};

export function formatScanReport(
  result: ScanResult,
  format: ScanReportFormat,
  options: ScanReportOptions,
): string {
  if (format === "json") {
    return formatJsonReport(result);
  }

  if (format === "html") {
    return formatHtmlReport(result);
  }

  return formatTextReport(result, options);
}

export function resolveScanReportFormat(options: {
  format?: string;
  json?: boolean;
}): ScanReportFormat {
  if (options.json === true && options.format && options.format !== "json") {
    throw new Error("--json cannot be combined with a non-json --format");
  }

  if (options.json === true) {
    return "json";
  }

  if (!options.format) {
    return "text";
  }

  if (isScanReportFormat(options.format)) {
    return options.format;
  }

  throw new Error(`Unsupported report format: ${options.format}`);
}

export function shouldReportErrorAsJson(options: {
  format?: string;
  json?: boolean;
}): boolean {
  return options.json === true || options.format === "json";
}

function isScanReportFormat(value: string): value is ScanReportFormat {
  return value === "text" || value === "json" || value === "html";
}
